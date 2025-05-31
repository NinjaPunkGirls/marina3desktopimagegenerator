// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
document.addEventListener("DOMContentLoaded", () => {
    const promptInput = document.getElementById("prompt");
    const generateBtn = document.getElementById("generate-btn");
    const imageContainer = document.getElementById("image-container");

    // WARNING: Storing API key directly in renderer is not secure.
    // This should be handled in the main process or a secure backend.
    const STABILITY_API_KEY = "sk-NGZlhQdx9OsZDTAHUdmgrIfrlPJTtJEEc02UqvzyFdENj6hJ"; // Replace with your actual API key
    // Corrected official Stability AI Platform API endpoint structure based on documentation
    const API_BASE_URL = "https://api.stability.ai/v1/generation";
    // Using an available engine_id based on the list command
    const ENGINE_ID = "stable-diffusion-v1-6"; // Changed to v1.6
    const API_ENDPOINT = `${API_BASE_URL}/${ENGINE_ID}/text-to-image`;

    generateBtn.addEventListener("click", async () => {
        const prompt = promptInput.value;
        if (prompt) {
            console.log("Generating image for prompt:", prompt);
            imageContainer.innerHTML = "<p>Generating...</p>";

            try {
                const response = await fetch(API_ENDPOINT, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json", // Request JSON response to get base64 images
                        "Authorization": `Bearer ${STABILITY_API_KEY}`,
                    },
                    body: JSON.stringify({
                        text_prompts: [{ text: prompt }], // Correct parameter name and structure as per documentation
                        cfg_scale: 7,
                        height: 512, // Reverted to 512, valid for v1.6
                        width: 512,  // Reverted to 512, valid for v1.6
                        samples: 1,
                        steps: 30, // Correct parameter name as per documentation
                        // Other parameters like 'seed', 'sampler', 'clip_guidance_preset', 'style_preset' can be added here
                        // See https://platform.stability.ai/docs/api-reference#tag/Generation
                    }),
                });

                if (!response.ok) {
                     const errorText = await response.text();
                     throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
                }

                const responseJSON = await response.json();

                // The API should return artifacts as per the official documentation example
                if (responseJSON.artifacts && responseJSON.artifacts.length > 0) {
                    imageContainer.innerHTML = ''; // Clear loading text
                    responseJSON.artifacts.forEach((image, index) => {
                        const imgElement = document.createElement("img");
                        imgElement.src = `data:image/png;base64,${image.base64}`;
                        imgElement.alt = `Generated image ${index + 1}`;
                         // Optional: Add some basic styling or container for images if needed
                        // const imgWrapper = document.createElement('div');
                        // imgWrapper.appendChild(imgElement);
                        // imageContainer.appendChild(imgWrapper);
                        imageContainer.appendChild(imgElement);
                    });
                }
                 else {
                    imageContainer.innerHTML = "<p>Error: Could not generate image or receive valid response.</p>";
                }

            } catch (error) {
                console.error("Error generating image:", error);
                imageContainer.innerHTML = `<p>Error: ${error.message}</p>`;
            }

        } else {
            alert("Please enter a prompt.");
        }
    });
}); 