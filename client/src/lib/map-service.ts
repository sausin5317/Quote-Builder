export async function calculateDistance(origin: string, destination: string): Promise<string> {
    if (!origin || !destination) return "0";

    // Ensure Google Maps API is loaded
    if (!(window as any).google || !(window as any).google.maps) {
        console.error("Google Maps API not loaded");
        return "0";
    }
    try {
        const routesLibrary = await (window as any).google.maps.importLibrary("routes") as any;
        const directionsService = new routesLibrary.DirectionsService();

        return new Promise((resolve, reject) => {
            directionsService.route(
                {
                    origin,
                    destination,
                    travelMode: routesLibrary.TravelMode.DRIVING,
                },
                (result: any, status: any) => {
                    if (status === routesLibrary.DirectionsStatus.OK && result) {
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
    } catch (error) {
        console.error("MapService: Error calculating distance", error);
        return "0";
    }
}
