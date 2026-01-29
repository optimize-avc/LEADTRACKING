/**
 * Data Collector Types for AI Lead Discovery
 * 
 * Defines the interface that all data sources must implement.
 */

import { TargetingCriteria, DiscoveredLead, TokenUsage } from '@/types/discovery';

// ========================================
// Raw Business Data (from data sources)
// ========================================

/**
 * Raw business data before AI analysis
 * This is what data collectors return
 */
export interface RawBusinessData {
    // Identifiers (for deduplication)
    placeId?: string;           // Google Places ID
    externalId?: string;        // Source-specific ID
    
    // Basic info
    name: string;
    industry?: string;
    website?: string;
    
    // Location
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    
    // Contact info
    phone?: string;
    email?: string;
    
    // Google Places specific
    rating?: number;            // 1-5 stars
    reviewCount?: number;       // Total reviews
    priceLevel?: number;        // 1-4 ($-$$$$)
    businessStatus?: string;    // OPERATIONAL, CLOSED, etc.
    types?: string[];           // Google place types
    
    // Enrichment data
    description?: string;       // From website or directory
    employeeCount?: number;     // If available
    yearFounded?: number;       // If available
    
    // Source tracking
    source: DataSourceType;
    sourceUrl?: string;
    fetchedAt: number;
}

/**
 * Data source types
 */
export type DataSourceType = 
    | 'google_places'
    | 'linkedin'
    | 'directory'
    | 'news'
    | 'jobs'
    | 'social'
    | 'mock';

// ========================================
// Data Collector Interface
// ========================================

/**
 * Search options passed to collectors
 */
export interface CollectorSearchOptions {
    criteria: TargetingCriteria;
    maxResults: number;
    pageToken?: string;         // For pagination
}

/**
 * Result from a collector search
 */
export interface CollectorSearchResult {
    businesses: RawBusinessData[];
    nextPageToken?: string;     // For pagination
    totalAvailable?: number;    // If API provides total count
    metadata: {
        source: DataSourceType;
        searchQuery?: string;
        searchLocation?: string;
        apiCalls: number;
        timestamp: number;
    };
}

/**
 * Interface that all data collectors must implement
 */
export interface DataCollector {
    /**
     * Unique identifier for this collector
     */
    readonly sourceType: DataSourceType;
    
    /**
     * Human-readable name
     */
    readonly name: string;
    
    /**
     * Check if this collector is properly configured (API keys, etc.)
     */
    isConfigured(): boolean;
    
    /**
     * Search for businesses matching the criteria
     */
    search(options: CollectorSearchOptions): Promise<CollectorSearchResult>;
    
    /**
     * Get details for a specific business (optional, for enrichment)
     */
    getDetails?(placeId: string): Promise<RawBusinessData | null>;
}

// ========================================
// Deduplication & Matching
// ========================================

/**
 * Create a deduplication key from raw business data
 * Used to identify the same business across sources
 */
export function createDedupeKey(business: RawBusinessData): string {
    // Primary: Google Place ID (globally unique)
    if (business.placeId) {
        return `places:${business.placeId}`;
    }
    
    // Secondary: Name + City + State (normalized)
    const normalizedName = business.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedCity = (business.city || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedState = (business.state || '').toLowerCase().replace(/[^a-z]/g, '');
    
    return `name:${normalizedName}:${normalizedCity}:${normalizedState}`;
}

/**
 * Merge multiple raw business records into one (for deduped entries)
 */
export function mergeBusinessData(records: RawBusinessData[]): RawBusinessData {
    if (records.length === 0) {
        throw new Error('Cannot merge empty array of business data');
    }
    
    if (records.length === 1) {
        return records[0];
    }
    
    // Start with the first record as base
    const merged = { ...records[0] };
    
    // Merge in data from other records, preferring non-null values
    for (let i = 1; i < records.length; i++) {
        const record = records[i];
        
        // Fill in missing values
        if (!merged.website && record.website) merged.website = record.website;
        if (!merged.phone && record.phone) merged.phone = record.phone;
        if (!merged.email && record.email) merged.email = record.email;
        if (!merged.industry && record.industry) merged.industry = record.industry;
        if (!merged.description && record.description) merged.description = record.description;
        if (!merged.employeeCount && record.employeeCount) merged.employeeCount = record.employeeCount;
        if (!merged.yearFounded && record.yearFounded) merged.yearFounded = record.yearFounded;
        
        // Take better rating data (more reviews = more reliable)
        if (record.reviewCount && (!merged.reviewCount || record.reviewCount > merged.reviewCount)) {
            merged.rating = record.rating;
            merged.reviewCount = record.reviewCount;
        }
    }
    
    return merged;
}

// ========================================
// Conversion Utilities
// ========================================

/**
 * Convert raw business data to a discovered lead format
 * (Partial - AI analysis will be added later)
 */
export function rawToDiscoveredLead(
    raw: RawBusinessData,
    companyId: string,
    profileId: string,
    sweepId: string
): Omit<DiscoveredLead, 'id' | 'aiAnalysis'> {
    return {
        companyId,
        discoveryProfileId: profileId,
        businessName: raw.name,
        industry: raw.industry || 'Unknown',
        website: raw.website || null,
        contacts: raw.phone || raw.email ? [{
            name: '',
            title: '',
            email: raw.email || null,
            phone: raw.phone || null,
            linkedin: null,
        }] : [],
        location: {
            address: raw.address || null,
            city: raw.city || 'Unknown',
            state: raw.state || 'Unknown',
            country: raw.country || 'US',
            coordinates: raw.coordinates || null,
        },
        verification: {
            status: 'pending',
            verifiedAt: null,
            checks: {
                websiteExists: !!raw.website,
                phoneValid: !!raw.phone,
                emailValid: !!raw.email,
                businessRegistered: false,
            },
        },
        sources: [{
            type: raw.source === 'google_places' ? 'google' : 
                  raw.source === 'linkedin' ? 'linkedin' :
                  raw.source === 'news' ? 'news' :
                  raw.source === 'jobs' ? 'jobs' :
                  raw.source === 'social' ? 'social' : 'directory',
            url: raw.sourceUrl || '',
            foundAt: raw.fetchedAt,
        }],
        status: 'new',
        sweepId,
        discoveredAt: Date.now(),
        reviewedAt: null,
        reviewedBy: null,
    };
}

// ========================================
// Cache Types
// ========================================

/**
 * Cached business data structure
 */
export interface CachedBusinessData {
    data: RawBusinessData;
    cachedAt: number;
    expiresAt: number;
}

/**
 * Cache TTLs (in milliseconds)
 */
export const CACHE_TTL = {
    businessInfo: 7 * 24 * 60 * 60 * 1000,     // 7 days
    aiAnalysis: 30 * 24 * 60 * 60 * 1000,      // 30 days
    searchResults: 24 * 60 * 60 * 1000,         // 24 hours
} as const;
