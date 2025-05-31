// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const { ipcRenderer } = require('electron'); // Import ipcRenderer
const fs = require('fs'); // Import file system module
const path = require('path'); // Import path module

document.addEventListener("DOMContentLoaded", () => {
    const promptInput = document.getElementById("prompt");
    const generateBtn = document.getElementById("generate-btn");
    const imageContainer = document.getElementById("image-container");

    const generalModeInputs = document.getElementById('general-mode-inputs');
    const posterModeInputs = document.getElementById('poster-mode-inputs');
    const modeSwitchBtn = document.getElementById("mode-switch-btn"); // Get the mode switch button

    const selectFolderBtn = document.getElementById("select-folder-btn"); // Get the select folder button
    const imageGrid = document.getElementById("image-grid"); // Get the image grid container

    const textToImageRadio = document.getElementById('text-to-image-radio');
    const imageToImageRadio = document.getElementById('image-to-image-radio');

    let currentMode = 'general'; // 'general' or 'poster'
    let currentGeneralSubMode = 'text-to-image'; // 'text-to-image' or 'image-to-image'

    let selectedInitImage = null; // Variable to store the currently selected image element

    // WARNING: Storing API key directly in renderer is not secure.
    // This should be handled in the main process or a secure backend.
    const STABILITY_API_KEY = "sk-NGZlhQdx9OsZDTAHUdmgrIfrlPJTtJEEc02UqvzyFdENj6hJ"; // Replace with your actual API key
    // Corrected official Stability AI Platform API endpoint structure based on documentation
    const API_BASE_URL = "https://api.stability.ai/v1/generation";
    // Using an available engine_id based on the list command
    const ENGINE_ID = "stable-diffusion-v1-6"; // Changed to v1.6
    // API_ENDPOINT will be determined based on whether an image is provided

    // Function to update UI based on current mode and general sub-mode
    function updateUIVisibility() {
        if (currentMode === 'general') {
            generalModeInputs.style.display = 'block';
            posterModeInputs.style.display = 'none';

            if (currentGeneralSubMode === 'text-to-image') {
                selectFolderBtn.style.display = 'none';
                imageGrid.style.display = 'none';
            } else { // image-to-image
                selectFolderBtn.style.display = 'block';
                imageGrid.style.display = 'flex';
            }
        } else { // poster
            generalModeInputs.style.display = 'none';
            posterModeInputs.style.display = 'block';
            // Decide visibility for folder button and image grid in poster mode if needed
            // For now, let's assume they are visible in poster mode for initial image selection
             selectFolderBtn.style.display = 'block';
             imageGrid.style.display = 'flex';
        }
    }

    // Initial UI setup
    updateUIVisibility();

    // Event listener for the mode switch button
    modeSwitchBtn.addEventListener('click', () => {
        if (currentMode === 'general') {
            currentMode = 'poster';
            modeSwitchBtn.textContent = 'Switch to General Mode';
            console.log('Switched to Poster Mode');
        } else {
            currentMode = 'general';
            modeSwitchBtn.textContent = 'Switch to Poster Mode';
            console.log('Switched to General Mode');
             // Reset general sub-mode to default when switching back
             currentGeneralSubMode = 'text-to-image';
             textToImageRadio.checked = true;
        }
        updateUIVisibility();
    });

    // Event listeners for general sub-mode radio buttons
    textToImageRadio.addEventListener('change', () => {
        if (textToImageRadio.checked) {
            currentGeneralSubMode = 'text-to-image';
            selectedInitImage = null; // Deselect any image when switching to text-to-image
            imageGrid.innerHTML = ''; // Clear image grid
            updateUIVisibility();
        }
    });

    imageToImageRadio.addEventListener('change', () => {
        if (imageToImageRadio.checked) {
            currentGeneralSubMode = 'image-to-image';
            updateUIVisibility();
        }
    });

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
        // Get the file path from the selected image element, if any, only if in image-to-image mode
        const initImageFile = (currentMode === 'general' && currentGeneralSubMode === 'image-to-image' && selectedInitImage) ? selectedInitImage.src : null;

        // Ensure a prompt is always provided
        if (!prompt && currentMode === 'general' && currentGeneralSubMode === 'text-to-image') {
            alert("Please enter a prompt.");
            return;
        } else if (!prompt && currentMode === 'general' && currentGeneralSubMode === 'image-to-image' && !selectedInitImage) {
             alert("Please enter a prompt and select an initial image.");
             return;
        } else if (!prompt && currentMode === 'poster'){
             alert("Please enter a prompt and fill in poster details.");
             // You might want more specific validation for poster mode inputs
             return;
        }

        // Need to convert file path to a File object for FormData, only if in image-to-image mode
        let initImageFileObject = null;
        if (initImageFile && currentMode === 'general' && currentGeneralSubMode === 'image-to-image') {
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

        // Determine API endpoint and request body based on current mode and sub-mode
        if (currentMode === 'general' && currentGeneralSubMode === 'image-to-image' && initImageFileObject) {
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
        } else if (currentMode === 'general' && currentGeneralSubMode === 'text-to-image') {
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
        } else if (currentMode === 'poster') {
             // Poster generation mode (currently uses text-to-image endpoint, needs refinement)
             // TODO: Construct prompt and request body for poster generation using poster-specific inputs
             // For now, just using the main prompt
             apiEndpoint = `${API_BASE_URL}/${ENGINE_ID}/text-to-image`; // Or potentially image-to-image with a selected initial image
             headers['Content-Type'] = 'application/json';
             const posterHeadline = document.getElementById('poster-headline').value;
             const posterBodyText = document.getElementById('poster-body-text').value;
             const posterStyle = document.getElementById('poster-style').value;

             // Example of constructing a prompt for poster mode (needs refinement)
             const posterPrompt = `Aged poster style. Headline: ${posterHeadline}. Body text: ${posterBodyText}. Style: ${posterStyle}. ${prompt}`.trim();

             requestBody = JSON.stringify({
                 text_prompts: [{ text: posterPrompt }],
                 cfg_scale: 7,
                 height: 512,
                 width: 512,
                 samples: 1,
                 steps: 30,
             });
             // TODO: Implement image-to-image for poster mode using selected initial image if available
        } else {
             // Should not happen with current logic, but as a fallback
             console.error("Unknown mode or sub-mode combination.");
             imageContainer.innerHTML = "<p>Error: Invalid mode selection.</p>";
             return;
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