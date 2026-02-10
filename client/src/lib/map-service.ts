export async function calculateDistance(origin: string, destination: string): Promise<string> {
    if (!origin || !destination) return "0";

    // Ensure Google Maps API is loaded
    if (!window.google || !window.google.maps) {
        console.error("Google Maps API not loaded");
        return "0";
    }

    const directionsService = new window.google.maps.DirectionsService();

    return new Promise((resolve, reject) => {
        directionsService.route(
            {
                origin,
                destination,
                travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK && result) {
                    const route = result.routes[0];
                    if (route && route.legs && route.legs.length > 0) {
                        const distanceMeters = route.legs[0].distance?.value || 0;
                        const distanceKm = (distanceMeters / 1000).toFixed(1);
                        console.log(`MapService: Distance calculated: ${distanceKm} km`);
                        resolve(distanceKm);
                    } else {
                        console.warn("MapService: No routes or legs found");
                        resolve("0");
                    }
                } else {
                    console.error(`MapService: Directions request failed: ${status}`);
                    resolve("0");
                }
            }
        );
    });
}
