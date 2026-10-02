// GET /api/event-details
// Returns the private event details. Only reachable with a valid session:
// functions/_middleware.js answers 401 for /api/* before this runs.
// Leave EVENT_ADDRESS unset while the address is TBD.

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json", "cache-control": "no-store" }
    });
}

export async function onRequestGet({ env }) {
    const lat = parseFloat(env.EVENT_LAT);
    const lng = parseFloat(env.EVENT_LNG);

    return jsonResponse({
        address: env.EVENT_ADDRESS || "",
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        venueName: env.EVENT_VENUE_NAME || "",
        venueDetails: env.EVENT_VENUE_DETAILS || ""
    });
}
