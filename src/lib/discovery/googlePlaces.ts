/**
 * Google Places API Integration for AI Lead Discovery
 * 
 * Uses Google Places API (Text Search) to find businesses matching targeting criteria.
 * Implements the DataCollector interface.
 * 
 * Cost notes (as of Jan 2026):
 * - Text Search: $32 per 1000 requests (Basic), $35 (Advanced), $40 (Preferred)
 * - Place Details: $17 per 1000 requests
 * - We use Basic fields to minimize costs
 * 
 * Setup required:
 * 1. Enable Places API in Google Cloud Console
 * 2. Create API key with Places API restriction
 * 3. Set GOOGLE_PLACES_API_KEY in environment
 */

import {
    DataCollector,
    DataSourceType,
    RawBusinessData,
    CollectorSearchOptions,
    CollectorSearchResult,
    CACHE_TTL,
} from './types';
import { TargetingCriteria } from '@/types/discovery';

// ========================================
// Types for Google Places API
// ========================================

/**
 * Google Places Text Search response
 * https://developers.google.com/maps/documentation/places/web-service/text-search
 */
interface GoogleTextSearchResponse {
    places?: GooglePlace[];
    nextPageToken?: string;
}

interface GooglePlace {
    id: string;                          // Place ID
    displayName?: {
        text: string;
        languageCode?: string;
    };
    formattedAddress?: string;
    addressComponents?: AddressComponent[];
    location?: {
        latitude: number;
        longitude: number;
    };
    rating?: number;
    userRatingCount?: number;
    priceLevel?: string;                 // PRICE_LEVEL_FREE, PRICE_LEVEL_INEXPENSIVE, etc.
    websiteUri?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    types?: string[];
    businessStatus?: string;             // OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY
    primaryType?: string;
    primaryTypeDisplayName?: {
        text: string;
        languageCode?: string;
    };
}

interface AddressComponent {
    longText: string;
    shortText: string;
    types: string[];
}

// ========================================
// In-Memory Cache (simple, for cost savings)
// ========================================

const searchCache = new Map<string, {
    result: CollectorSearchResult;
    expiresAt: number;
}>();

const detailsCache = new Map<string, {
    data: RawBusinessData;
    expiresAt: number;
}>();

function getCacheKey(options: CollectorSearchOptions): string {
    const { criteria, maxResults, pageToken } = options;
    return JSON.stringify({
        industries: criteria.industries.sort(),
        cities: criteria.geography.cities.sort(),
        states: criteria.geography.states.sort(),
        maxResults,
        pageToken,
    });
}

// ========================================
// Google Places Collector Implementation
// ========================================

export class GooglePlacesCollector implements DataCollector {
    readonly sourceType: DataSourceType = 'google_places';
    readonly name = 'Google Places';
    
    private apiKey: string | null = null;
    private readonly apiBase = 'https://places.googleapis.com/v1/places:searchText';
    
    constructor() {
        // Try to get API key from environment
        this.apiKey = process.env.GOOGLE_PLACES_API_KEY || null;
    }
    
    /**
     * Check if the collector is properly configured
     */
    isConfigured(): boolean {
        return !!this.apiKey;
    }
    
    /**
     * Search for businesses matching the criteria
     */
    async search(options: CollectorSearchOptions): Promise<CollectorSearchResult> {
        const { criteria, maxResults, pageToken } = options;
        
        // Check configuration
        if (!this.isConfigured()) {
            console.warn('[GooglePlaces] API key not configured, returning empty results');
            return this.emptyResult();
        }
        
        // Check cache
        const cacheKey = getCacheKey(options);
        const cached = searchCache.get(cacheKey);
        if (cached && Date.now() < cached.expiresAt) {
            console.log('[GooglePlaces] Returning cached search results');
            return cached.result;
        }
        
        // Build search queries based on criteria
        const searchQueries = this.buildSearchQueries(criteria);
        
        if (searchQueries.length === 0) {
            console.warn('[GooglePlaces] No valid search queries could be built');
            return this.emptyResult();
        }
        
        // Execute searches (limited to control costs)
        const allBusinesses: RawBusinessData[] = [];
        let apiCalls = 0;
        const maxQueries = Math.min(searchQueries.length, 3); // Max 3 queries per sweep
        
        for (let i = 0; i < maxQueries && allBusinesses.length < maxResults; i++) {
            const query = searchQueries[i];
            
            try {
                const response = await this.executeSearch(query, maxResults - allBusinesses.length, pageToken);
                apiCalls++;
                
                if (response.places) {
                    const converted = response.places.map(place => this.convertPlace(place, query));
                    allBusinesses.push(...converted);
                }
                
                // Respect rate limits
                if (i < maxQueries - 1) {
                    await this.delay(100); // 100ms between requests
                }
            } catch (error) {
                console.error(`[GooglePlaces] Search error for query "${query}":`, error);
                // Continue with other queries
            }
        }
        
        const result: CollectorSearchResult = {
            businesses: allBusinesses.slice(0, maxResults),
            metadata: {
                source: 'google_places',
                searchQuery: searchQueries.slice(0, maxQueries).join(' | '),
                apiCalls,
                timestamp: Date.now(),
            },
        };
        
        // Cache the result
        searchCache.set(cacheKey, {
            result,
            expiresAt: Date.now() + CACHE_TTL.searchResults,
        });
        
        console.log(`[GooglePlaces] Found ${result.businesses.length} businesses with ${apiCalls} API calls`);
        return result;
    }
    
    /**
     * Get details for a specific place (for enrichment)
     */
    async getDetails(placeId: string): Promise<RawBusinessData | null> {
        if (!this.isConfigured()) {
            return null;
        }
        
        // Check cache
        const cached = detailsCache.get(placeId);
        if (cached && Date.now() < cached.expiresAt) {
            return cached.data;
        }
        
        try {
            const url = `https://places.googleapis.com/v1/places/${placeId}`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': this.apiKey!,
                    'X-Goog-FieldMask': 'id,displayName,formattedAddress,addressComponents,location,rating,userRatingCount,websiteUri,nationalPhoneNumber,types,businessStatus,primaryType',
                },
            });
            
            if (!response.ok) {
                console.error(`[GooglePlaces] Details fetch failed: ${response.status}`);
                return null;
            }
            
            const place: GooglePlace = await response.json();
            const data = this.convertPlace(place);
            
            // Cache the result
            detailsCache.set(placeId, {
                data,
                expiresAt: Date.now() + CACHE_TTL.businessInfo,
            });
            
            return data;
        } catch (error) {
            console.error(`[GooglePlaces] Error fetching details for ${placeId}:`, error);
            return null;
        }
    }
    
    // ========================================
    // Private Methods
    // ========================================
    
    /**
     * Build search queries from targeting criteria
     * Creates queries like "plumbing company in Houston, TX"
     */
    private buildSearchQueries(criteria: TargetingCriteria): string[] {
        const queries: string[] = [];
        const { industries, geography } = criteria;
        
        // Build location strings
        const locations: string[] = [];
        
        // Cities have highest priority
        if (geography.cities.length > 0) {
            // Combine city with state if available
            for (const city of geography.cities.slice(0, 3)) { // Max 3 cities
                const state = geography.states.length > 0 ? geography.states[0] : '';
                locations.push(state ? `${city}, ${state}` : city);
            }
        } else if (geography.states.length > 0) {
            // Just states
            for (const state of geography.states.slice(0, 3)) { // Max 3 states
                locations.push(state);
            }
        }
        
        // If no geography specified, skip (too broad)
        if (locations.length === 0) {
            console.warn('[GooglePlaces] No geography specified, queries will be too broad');
            return [];
        }
        
        // Build queries: industry + location combinations
        if (industries.length === 0) {
            // No industries specified - use "businesses" as fallback
            for (const location of locations) {
                queries.push(`businesses in ${location}`);
            }
        } else {
            // Create industry + location combinations
            for (const industry of industries.slice(0, 5)) { // Max 5 industries
                for (const location of locations) {
                    queries.push(`${industry} in ${location}`);
                }
            }
        }
        
        return queries;
    }
    
    /**
     * Execute a single search request
     */
    private async executeSearch(
        query: string,
        maxResults: number,
        pageToken?: string
    ): Promise<GoogleTextSearchResponse> {
        const requestBody: Record<string, unknown> = {
            textQuery: query,
            pageSize: Math.min(maxResults, 20), // API max is 20 per request
            languageCode: 'en',
        };
        
        if (pageToken) {
            requestBody.pageToken = pageToken;
        }
        
        const response = await fetch(this.apiBase, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': this.apiKey!,
                // Request only fields we need (minimizes cost)
                'X-Goog-FieldMask': [
                    'places.id',
                    'places.displayName',
                    'places.formattedAddress',
                    'places.addressComponents',
                    'places.location',
                    'places.rating',
                    'places.userRatingCount',
                    'places.websiteUri',
                    'places.nationalPhoneNumber',
                    'places.types',
                    'places.businessStatus',
                    'places.primaryType',
                    'places.primaryTypeDisplayName',
                    'nextPageToken',
                ].join(','),
            },
            body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Google Places API error (${response.status}): ${error}`);
        }
        
        return response.json();
    }
    
    /**
     * Convert Google Place to RawBusinessData
     */
    private convertPlace(place: GooglePlace, searchQuery?: string): RawBusinessData {
        // Extract address components
        let city = '';
        let state = '';
        let country = 'US';
        
        if (place.addressComponents) {
            for (const component of place.addressComponents) {
                if (component.types.includes('locality')) {
                    city = component.longText;
                } else if (component.types.includes('administrative_area_level_1')) {
                    state = component.shortText;
                } else if (component.types.includes('country')) {
                    country = component.shortText;
                }
            }
        }
        
        // Infer industry from types
        const industry = this.inferIndustry(place.types || [], place.primaryType, place.primaryTypeDisplayName?.text);
        
        return {
            placeId: place.id,
            name: place.displayName?.text || 'Unknown Business',
            industry,
            website: place.websiteUri,
            address: place.formattedAddress,
            city,
            state,
            country,
            coordinates: place.location ? {
                lat: place.location.latitude,
                lng: place.location.longitude,
            } : undefined,
            phone: place.nationalPhoneNumber,
            rating: place.rating,
            reviewCount: place.userRatingCount,
            businessStatus: place.businessStatus,
            types: place.types,
            source: 'google_places',
            sourceUrl: `https://www.google.com/maps/place/?q=place_id:${place.id}`,
            fetchedAt: Date.now(),
        };
    }
    
    /**
     * Infer industry from Google Place types
     */
    private inferIndustry(types: string[], primaryType?: string, primaryTypeDisplay?: string): string {
        // Use primary type display name if available
        if (primaryTypeDisplay) {
            return primaryTypeDisplay;
        }
        
        // Map common Google types to industries
        const typeToIndustry: Record<string, string> = {
            'plumber': 'Plumbing',
            'electrician': 'Electrical',
            'hvac_contractor': 'HVAC',
            'roofing_contractor': 'Roofing',
            'general_contractor': 'Construction',
            'restaurant': 'Restaurant',
            'store': 'Retail',
            'health': 'Healthcare',
            'doctor': 'Healthcare',
            'dentist': 'Healthcare',
            'car_dealer': 'Automotive',
            'car_repair': 'Automotive',
            'lawyer': 'Legal Services',
            'accounting': 'Financial Services',
            'bank': 'Financial Services',
            'real_estate_agency': 'Real Estate',
            'insurance_agency': 'Insurance',
            'moving_company': 'Moving & Logistics',
            'storage': 'Moving & Logistics',
            'gym': 'Fitness',
            'spa': 'Wellness',
            'hotel': 'Hospitality',
            'travel_agency': 'Travel',
            'school': 'Education',
            'university': 'Education',
            'church': 'Religious',
            'park': 'Recreation',
        };
        
        // Check primary type first
        if (primaryType && typeToIndustry[primaryType]) {
            return typeToIndustry[primaryType];
        }
        
        // Check all types
        for (const type of types) {
            const normalizedType = type.toLowerCase().replace(/_/g, ' ');
            if (typeToIndustry[type]) {
                return typeToIndustry[type];
            }
            // Partial matches
            for (const [key, industry] of Object.entries(typeToIndustry)) {
                if (normalizedType.includes(key) || key.includes(normalizedType)) {
                    return industry;
                }
            }
        }
        
        // Default based on first type
        if (types.length > 0) {
            return types[0].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
        
        return 'General Business';
    }
    
    /**
     * Return empty result
     */
    private emptyResult(): CollectorSearchResult {
        return {
            businesses: [],
            metadata: {
                source: 'google_places',
                apiCalls: 0,
                timestamp: Date.now(),
            },
        };
    }
    
    /**
     * Simple delay helper
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ========================================
// Singleton Instance
// ========================================

let instance: GooglePlacesCollector | null = null;

export function getGooglePlacesCollector(): GooglePlacesCollector {
    if (!instance) {
        instance = new GooglePlacesCollector();
    }
    return instance;
}

// ========================================
// Helper: Check if Google Places is available
// ========================================

export function isGooglePlacesConfigured(): boolean {
    return !!process.env.GOOGLE_PLACES_API_KEY;
}
