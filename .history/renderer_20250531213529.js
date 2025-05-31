// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
document.addEventListener("DOMContentLoaded", () => {
    const promptInput = document.getElementById("prompt");
    const generateBtn = document.getElementById("generate-btn");
    const imageContainer = document.getElementById("image-container");
    const initImageInput = document.getElementById("init-image"); // Get the new file input

    // WARNING: Storing API key directly in renderer is not secure.
    // This should be handled in the main process or a secure backend.
    const STABILITY_API_KEY = "sk-NGZlhQdx9OsZDTAHUdmgrIfrlPJTtJEEc02UqvzyFdENj6hJ"; // Replace with your actual API key
    // Corrected official Stability AI Platform API endpoint structure based on documentation
    const API_BASE_URL = "https://api.stability.ai/v1/generation";
    // Using an available engine_id based on the list command
    const ENGINE_ID = "stable-diffusion-v1-6"; // Changed to v1.6
    // API_ENDPOINT will be determined based on whether an image is provided

    generateBtn.addEventListener("click", async () => {
        const prompt = promptInput.value;
        const initImageFile = initImageInput.files[0]; // Get the selected file

        // Ensure a prompt is always provided
        if (!prompt) {
            alert("Please enter a prompt.");
            return; 
        }

        console.log("Generating image...");
        imageContainer.innerHTML = "<p>Generating...</p>";

        let apiEndpoint;
        let requestBody;
        let headers = {
            "Accept": "application/json",
            "Authorization": `Bearer ${STABILITY_API_KEY}`,
        };

        if (initImageFile) {
            // Image-to-image generation
            apiEndpoint = `${API_BASE_URL}/${ENGINE_ID}/image-to-image`;

            const formData = new FormData();
            formData.append('init_image', initImageFile);
            formData.append('text_prompts[0][text]', prompt); // Prompt is now guaranteed to have a value
            // Add other parameters as needed, e.g., steps, cfg_scale, etc.
            // For image-to-image, strength is an important parameter (0.0 to 1.0)
            // Lower strength means less noise added to the initial image (closer to original)
            // Higher strength means more noise added (further from original, more creative)
            // Default strength is 0.35 according to documentation.
            // formData.append('strength', '0.5'); // Example of adding strength
            // formData.append('cfg_scale', '7'); // Example of adding cfg_scale

            requestBody = formData;
            // Content-Type is automatically set to multipart/form-data for FormData
            // headers['Content-Type'] = 'multipart/form-data'; // Do NOT manually set this with FormData
        } else {
            // Text-to-image generation (prompt is already guaranteed to have a value)
            apiEndpoint = `${API_BASE_URL}/${ENGINE_ID}/text-to-image`;
            headers['Content-Type'] = 'application/json';
            requestBody = JSON.stringify({
                text_prompts: [{ text: prompt }],
                cfg_scale: 7,
                height: 512,
                width: 512,
                samples: 1,
                steps: 30,
            });
        }

        try {
            const response = await fetch(apiEndpoint, {
                method: "POST",
                headers: headers,
                body: requestBody,
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
                    imgElement.src = `data:image/png;base64,${image.base64}`; // Assuming PNG base64 based on docs
                    imgElement.alt = `Generated image ${index + 1}`;
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
    });
}); 