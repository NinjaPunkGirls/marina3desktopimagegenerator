// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const { ipcRenderer } = require('electron'); // Import ipcRenderer
const fs = require('fs'); // Import file system module
const path = require('path'); // Import path module

document.addEventListener("DOMContentLoaded", () => {
    const promptInput = document.getElementById("prompt");
    const generateBtn = document.getElementById("generate-btn");
    const imageContainer = document.getElementById("image-container");
    // Remove the single image input reference
    // const initImageInput = document.getElementById("init-image"); // Get the new file input

    const selectFolderBtn = document.getElementById("select-folder-btn"); // Get the new button
    const imageGrid = document.getElementById("image-grid"); // Get the image grid container

    let selectedInitImage = null; // Variable to store the currently selected image element

    // WARNING: Storing API key directly in renderer is not secure.
    // This should be handled in the main process or a secure backend.
    const STABILITY_API_KEY = "sk-NGZlhQdx9OsZDTAHUdmgrIfrlPJTtJEEc02UqvzyFdENj6hJ"; // Replace with your actual API key
    // Corrected official Stability AI Platform API endpoint structure based on documentation
    const API_BASE_URL = "https://api.stability.ai/v1/generation";
    // Using an available engine_id based on the list command
    const ENGINE_ID = "stable-diffusion-v1-6"; // Changed to v1.6
    // API_ENDPOINT will be determined based on whether an image is provided

    // Event listener for the select folder button
    selectFolderBtn.addEventListener('click', () => {
        ipcRenderer.send('open-directory-dialog'); // Send message to main process
    });

    // IPC listener for receiving the selected directory path
    ipcRenderer.on('selected-directory', (event, directoryPath) => {
        if (directoryPath) {
            console.log('Selected directory:', directoryPath);
            displayImagesFromDirectory(directoryPath);
        } else {
            console.log('Directory selection canceled.');
            imageGrid.innerHTML = '<p>No directory selected.</p>';
        }
    });

    // Function to read images from a directory and display them
    function displayImagesFromDirectory(directoryPath) {
        // Clear previous images
        imageGrid.innerHTML = '';
        selectedInitImage = null; // Reset selected image

        fs.readdir(directoryPath, (err, files) => {
            if (err) {
                console.error('Error reading directory:', err);
                imageGrid.innerHTML = '<p>Error reading directory.</p>';
                return;
            }

            const imageFiles = files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                // Filter for common image extensions
                return ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].includes(ext);
            });

            if (imageFiles.length === 0) {
                imageGrid.innerHTML = '<p>No image files found in this directory.</p>';
                return;
            }

            imageFiles.forEach(file => {
                const imgPath = path.join(directoryPath, file);
                const imgElement = document.createElement('img');
                imgElement.src = imgPath; // Electron can load local files directly
                imgElement.alt = file;
                imgElement.classList.add('thumbnail'); // Add a class for styling

                // Add click listener to select the image
                imgElement.addEventListener('click', () => {
                    // Deselect previously selected image
                    if (selectedInitImage) {
                        selectedInitImage.classList.remove('selected');
                    }
                    // Select the current image
                    imgElement.classList.add('selected');
                    selectedInitImage = imgElement;
                    console.log('Selected image:', imgPath);
                });

                imageGrid.appendChild(imgElement);
            });
        });
    }

    generateBtn.addEventListener("click", async () => {
        const prompt = promptInput.value;
        // Get the file path from the selected image element, if any
        const initImageFile = selectedInitImage ? selectedInitImage.src : null;

        // Ensure a prompt is always provided
        if (!prompt) {
            alert("Please enter a prompt.");
            return;
        }

        // Need to convert file path to a File object for FormData
        let initImageFileObject = null;
        if (initImageFile) {
             try {
                const response = await fetch(initImageFile);
                const blob = await response.blob();
                initImageFileObject = new File([blob], path.basename(initImageFile), { type: blob.type });
             } catch (error) {
                console.error("Error fetching image file:", error);
                imageContainer.innerHTML = '<p>Error loading initial image.</p>';
                return;
             }
        }

        console.log("Generating image...");
        imageContainer.innerHTML = "<p>Generating...</p>";

        let apiEndpoint;
        let requestBody;
        let headers = {
            "Accept": "application/json",
            "Authorization": `Bearer ${STABILITY_API_KEY}`,
        };

        // Use initImageFileObject for the check
        if (initImageFileObject) {
            // Image-to-image generation
            apiEndpoint = `${API_BASE_URL}/${ENGINE_ID}/image-to-image`;

            const formData = new FormData();
            formData.append('init_image', initImageFileObject); // Append the File object
            formData.append('text_prompts[0][text]', prompt);
            // Add other parameters as needed, e.g., steps, cfg_scale, etc.
            // For image-to-image, strength is an important parameter (0.0 to 1.0)
            // Lower strength means less noise added to the initial image (closer to original)
            // Higher strength means more noise added (further from original, more creative)
            // Default strength is 0.35 according to documentation.
            formData.append('strength', '0.5'); // Example of adding strength
            // formData.append('cfg_scale', '7'); // Example of adding cfg_scale

            requestBody = formData;
            // Content-Type is automatically set to multipart/form-data for FormData
            // headers['Content-Type'] = 'multipart/form-data'; // Do NOT manually set this with FormData
        } else {
            // Text-to-image generation
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