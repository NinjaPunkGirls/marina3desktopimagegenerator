// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
document.addEventListener("DOMContentLoaded", () => {
    const promptInput = document.getElementById("prompt");
    const generateBtn = document.getElementById("generate-btn");
    const imageContainer = document.getElementById("image-container");

    // WARNING: Storing API key directly in renderer is not secure.
    // This should be handled in the main process or a secure backend.
    const STABILITY_API_KEY = "sk-NGZlhQdx9OsZDTAHUdmgrIfrlPJTtJEEc02UqvzyFdENj6hJ"; // Replace with your actual API key
    const API_ENDPOINT = "https://stablediffusionapi.com/api/v3/text2img"; // Corrected endpoint

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
                        key: STABILITY_API_KEY, // The API requires the key in the body as well
                        prompt: prompt,
                        cfg_scale: 7,
                        height: 512,
                        width: 512,
                        samples: 1,
                        num_inference_steps: 30,
                        // Other parameters can be added here based on API documentation
                    }),
                });

                if (!response.ok) {
                     const errorText = await response.text();
                     throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
                }

                const responseJSON = await response.json();

                if (responseJSON.output && responseJSON.output.length > 0) {
                    // Assuming the API returns an array of image URLs in the 'output' field
                    responseJSON.output.forEach((imageUrl, index) => {
                         const imgElement = document.createElement("img");
                         imgElement.src = imageUrl;
                         imgElement.alt = `Generated image ${index + 1}`;
                         imageContainer.innerHTML = ''; // Clear loading text
                         imageContainer.appendChild(imgElement);
                     });
                } else if (responseJSON.artifacts) {
                    // Handle base64 encoded images if the above doesn't work
                    responseJSON.artifacts.forEach((image, index) => {
                        const imgElement = document.createElement("img");
                        imgElement.src = `data:image/png;base64,${image.base64}`;
                        imgElement.alt = `Generated image ${index + 1}`;
                        imageContainer.innerHTML = ''; // Clear loading text
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