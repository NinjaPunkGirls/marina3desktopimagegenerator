// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById("prompt");
    const generateBtn = document.getElementById("generate-btn");
    const imageContainer = document.getElementById("image-container");

    // WARNING: Storing API key directly in renderer is not secure.
    // This should be handled in the main process or a secure backend.
    const STABILITY_API_KEY = "sk-NGZlhQdx9OsZDTAHUdmgrIfrlPJTtJEEc02UqvzyFdENj6hJ"; // Replace with your actual API key
    const API_ENDPOINT = "https://api.stability.ai/v1/generation/stable-diffusion-v1-5/text-to-image"; // Example endpoint, may vary based on model

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
                        "Accept": "application/json",
                        "Authorization": `Bearer ${STABILITY_API_KEY}`,
                    },
                    body: JSON.stringify({
                        text_prompts: [{ text: prompt }],
                        cfg_scale: 7,
                        height: 512,
                        width: 512,
                        samples: 1,
                        steps: 30,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const responseJSON = await response.json();

                if (responseJSON.artifacts) {
                    responseJSON.artifacts.forEach((image, index) => {
                        const imgElement = document.createElement("img");
                        imgElement.src = `data:image/png;base64,${image.base64}`;
                        imgElement.alt = `Generated image ${index + 1}`;
                        imageContainer.innerHTML = ''; // Clear loading text
                        imageContainer.appendChild(imgElement);
                    });
                } else {
                    imageContainer.innerHTML = "<p>Error: Could not generate image.</p>";
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