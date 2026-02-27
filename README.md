# CycleScout AI

CycleScout AI is an intelligent web application designed to help communities turn broken or unwanted items into valuable resources. By leveraging Google's AI technologies, the platform provides instant repair guides, creative upcycling ideas, and a community-driven "Scrap Board" to easily claim or list discarded materials.

---

## 🧠 Which Google AI Technology Did We Implement?
We implemented **Gemini 2.5 Flash** (via the Google Generative Language API) as the core intelligence engine behind CycleScout. 

Specifically, we utilize Gemini's multimodal capabilities (Vision + Text) to:
1. **Analyze Images**: Users upload photos of broken items and Gemini instantly identifies the item name, product model, and its primary composite materials.
2. **Determine Repairability**: The model assigns a "Repairability Score" (1-10) to help users gauge if an item is worth fixing or better suited for scrap.
3. **Generate Upcycle Ideas**: Gemini provides creative, contextual ideas on how to repurpose the materials if repair isn't viable.
4. **Contextual Chat Assistant**: We use Gemini as a conversational agent, retaining context of the scanned item to offer specific troubleshooting advice and dynamically refine YouTube repair tutorial search queries based on user feedback.

## 💡 How Does AI Make the Solution Smarter?
Without AI, users would need to manually identify their broken item, guess its materials, and spend significant time searching for relevant repair tutorials or upcycling ideas. 

**With AI, the solution becomes seamless:**
- **Zero-Friction Triage**: A single photo upload instantly generates a comprehensive breakdown of the item's potential.
- **Dynamic Context**: The AI Assistant doesn't just provide static output; it chats with the user to diagnose specific problems and refines search queries in real-time. 
- **Automated Data Entry**: When a user decides to list an item on the Scrap Board, the AI has already extracted the item name, product model, and materials, making the submission process effortless.

## 🤔 What Would the Solution Lose Without AI? (And How to Amend It)
Without AI, CycleScout would lose its core value proposition: **instant, personalized triage**. 
It would devolve into a manual forum where users have to write their own descriptions, search for their own materials, and manually post listings.

**To amend it without AI:**
We would need to build a massive, complex decision-tree wizard. Users would have to manually select categories (e.g., Electronics -> Fans -> Pedestal Fans), check boxes for materials (Plastic, Copper), and manually search YouTube. The Scrap Board would require entirely manual data entry, significantly increasing user drop-off.

## 🌟 What Makes This Project Unique?
CycleScout sits at the intersection of **sustainability, community, and artificial intelligence**. 
Unlike generic marketplace apps, CycleScout actively encourages *repair and upcycling before disposal*. It doesn't just connect people with junk; it connects them with the *knowledge* to fix that junk, using an integrated AI assistant to lower the barrier to entry for DIY repairs. 

## 🚀 What's the Growth Potential?
The growth potential is substantial, particularly within localized communities (university campuses, maker spaces, neighborhoods).
1. **Gamification**: Introducing leaderboards for "Most Items Repaired" or "Most Materials Saved."
2. **Local Hardware Integration**: Partnering with local hardware stores to suggest exactly which parts/tools to buy based on the AI's diagnosis.
3. **Advanced Computer Vision**: Upgrading to spatial/video analysis to identify specific broken components in 3D space.

## 🛠️ Which Google Developer Technology Did We Use?
- **Gemini 2.5 Flash API**: For multimodal image analysis, text generation, and conversational context tracking.
- **YouTube Data API (via iframe/search queries)**: To seamlessly embed and display relevant repair tutorials based on Gemini's specific query generation.
- **Google Apps Script & Google Sheets**: Deployed as a serverless backend webhook to handle the Scrap Board database, allowing us to rapidly prototype a REST API without spinning up a traditional database server.

## 🏗️ Solution Architecture Brief Walkthrough
1. **Frontend**: A highly responsive, glassmorphism-inspired UI built with Vanilla JavaScript, HTML, and CSS (bundled with Vite).
2. **Image Processing**: Users upload an image, which is converted to Base64 on the client side.
3. **AI Layer**: The Base64 image and a strict JSON-schema prompt are sent to the Gemini API. Gemini returns structured JSON containing the item analysis and a YouTube search query.
4. **Video Layer**: The UI dynamically updates with an embedded YouTube player featuring the tutorials found using Gemini's query.
5. **Chat Layer**: Users can converse with the AI in a floating widget. The app maintains a `user` and `model` message history array, ensuring the Gemini API retains context for troubleshooting.
6. **Backend/Database Layer (Scrap Board)**: If an item is scrapped, the frontend sends a POST request to a Google Apps Script Webhook. The script parses the payload (including the Base64 image) and appends it to a Google Sheet, which acts as our lightweight database.

## 🚧 Technical Challenges Faced & Trade-offs
**Challenge: Database & Image Hosting Constraints**
Initially, we considered using Firebase for robust database and image storage. However, due to budget/payment constraints for higher-tier storage and avoiding complex auth flows for an MVP, we pivoted.

**Trade-off & Solution: Google Sheets as a Database**
We traded the robustness of Firebase for the extreme simplicity of Google Sheets via Apps Script. 
- *Trade-off*: Google Sheets is not designed for heavy, concurrent read/writes and handling massive Base64 image strings can bloat the sheet.
- *Solution*: For an MVP/hackathon scale, it works perfectly. We encode the image in Base64 on the frontend and pass it directly to the Apps Script webhook to append as a text cell. 

**Challenge: Gemini API 400 Bad Request**
We encountered a strict formatting error (`GenerateContentRequest.contents[2].parts[0].data: required oneof field 'data'`) when sending chat history to Gemini.
- *Solution*: We had to strictly refactor our payload generation to ensure the chat history *always* started with a `user` role and perfectly alternated `user -> model -> user`, injecting our system context into the first mock user message instead of a separate system block.

## 🔮 Future Steps
- **Migrate Backend**: Transition from Google Sheets + Base64 storage to a robust backend (e.g., Firebase, Supabase, or AWS S3) for proper image hosting and scalable database querying.
- **User Authentication**: Implement Google OAuth so users can manage their Scrap Board listings, earn "Sustainability Badges", and save specific repair tutorials to a profile.
- **Location Proximity**: Add geospatial querying to the Scrap Board so users can filter items by distance.

## 🌍 Adaptability to a Wider Audience
CycleScout is designed to be completely hardware-agnostic. Because it relies on a Generalized Large Multimodal Model (Gemini), it doesn't need to be trained on specific datasets (like bicycles or washing machines). 
This means the EXACT same application can be deployed for:
- **University IT Departments**: Triaging broken monitors and keyboards.
- **Bicycle Co-ops**: Identifying derailleur types and sourcing spare chains.
- **Poverty Relief Organizations**: Upcycling old furniture and appliances for community reuse. 
By simply tweaking the initial prompt, the bounds of CycleScout are limitless.
