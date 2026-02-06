/**
 * Email tracking utilities
 */

/**
 * Generate a tracking pixel URL for an email
 */
export function generateTrackingPixelUrl(
    baseUrl: string,
    userId: string,
    leadId: string,
    emailId: string,
    sentAt: number = Date.now()
): string {
    // Encode tracking data
    const trackingData = `${userId}:${leadId}:${emailId}:${sentAt}`;
    const trackingId = Buffer.from(trackingData).toString('base64');
    
    return `${baseUrl}/api/email/track/${trackingId}`;
}

/**
 * Generate HTML for a tracking pixel
 */
export function generateTrackingPixelHtml(
    baseUrl: string,
    userId: string,
    leadId: string,
    emailId: string
): string {
    const pixelUrl = generateTrackingPixelUrl(baseUrl, userId, leadId, emailId);
    
    return `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`;
}

/**
 * Inject tracking pixel into email HTML body
 */
export function injectTrackingPixel(
    htmlBody: string,
    baseUrl: string,
    userId: string,
    leadId: string,
    emailId: string
): string {
    const pixel = generateTrackingPixelHtml(baseUrl, userId, leadId, emailId);
    
    // If body has closing body tag, insert before it
    if (htmlBody.includes('</body>')) {
        return htmlBody.replace('</body>', `${pixel}</body>`);
    }
    
    // Otherwise append to end
    return htmlBody + pixel;
}

/**
 * Decode a tracking ID back to its components
 */
export function decodeTrackingId(trackingId: string): {
    userId: string;
    leadId: string;
    emailId: string;
    sentAt: number;
} | null {
    try {
        const decoded = Buffer.from(trackingId, 'base64').toString('utf-8');
        const [userId, leadId, emailId, sentAt] = decoded.split(':');
        
        if (!userId || !leadId || !emailId) {
            return null;
        }
        
        return {
            userId,
            leadId,
            emailId,
            sentAt: parseInt(sentAt) || 0,
        };
    } catch {
        return null;
    }
}
