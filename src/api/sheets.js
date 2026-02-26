// To use the Sheets API securely from a frontend, we route through a Google Apps Script proxy.
const WEBHOOK_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

/**
 * Submits an item to the community scrap board via Google Apps Script Proxy
 * @param {Object} scrapItem - The item object to submit
 * @param {string} scrapItem.item_name
 * @param {string} scrapItem.materials
 * @param {string} scrapItem.location
 * @param {string} scrapItem.contact
 */
export async function submitToScrapBoard(scrapItem) {
    if (!WEBHOOK_URL) {
        console.warn("No Google Apps Script Webhook URL provided. Simulating submission.");
        // Simulate API delay
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({ success: true, message: "Simulated success (No Webhook URL configured)" });
            }, 1000);
        });
    }

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            // Using 'text/plain' to avoid CORS preflight OPTIONS request from the browser
            // which Apps Script natively rejects.
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(scrapItem) // Send the item payload
        });

        // Handle opaque responses (from no-cors or redirect scenarios)
        if (response.type === 'opaque') {
            return { success: true, message: "Request sent (opaque response)" };
        }

        if (!response.ok) {
            throw new Error(`Sheets API Error: ${response.status}`);
        }

        // Attempt to parse response if it provides one
        try {
            return await response.json();
        } catch (e) {
            return { success: true, message: "Request sent successfully." };
        }

    } catch (error) {
        console.error("Error submitting to Scrap Board:", error);
        throw error;
    }
}

/**
 * Fetches all items from the community scrap board
 */
export async function fetchScrapBoard() {
    if (!WEBHOOK_URL) {
        return [
            { id: 1, item_name: "Broken Desk Fan", materials: "Plastic, Copper", location: "Engineering Block Foyer", status: "Available", timestamp: new Date().toISOString() },
            { id: 2, item_name: "Scrap Plywood (2x4 pieces)", materials: "Wood", location: "Design Studio B", status: "Available", timestamp: new Date().toISOString() },
        ];
    }

    try {
        const response = await fetch(`${WEBHOOK_URL}?action=getScrap`);

        if (!response.ok) {
            throw new Error(`Sheets API Fetch Error: ${response.status}`);
        }

        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error("Error fetching Scrap Board:", error);
        throw error;
    }
}
