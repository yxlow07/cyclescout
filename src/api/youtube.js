const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

export async function searchYouTubeTutorial(query) {
    if (!YOUTUBE_API_KEY) {
        throw new Error("YouTube API key is not configured.");
    }

    const encodedQuery = encodeURIComponent(query);
    const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q=${encodedQuery}&type=video&key=${YOUTUBE_API_KEY}`;

    try {
        const response = await fetch(endpoint);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`YouTube API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (data.items && data.items.length > 0) {
            return data.items.map(item => item.id.videoId);
        }

        return []; // No results found
    } catch (error) {
        console.error("Error in searchYouTubeTutorial:", error);
        throw error;
    }
}
