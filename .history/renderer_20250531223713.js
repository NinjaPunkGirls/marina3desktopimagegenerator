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

    const selectSingleImageBtn = document.getElementById('select-single-image-btn'); // Get the select single image button
    const singleImageInput = document.getElementById('single-image-input'); // Get the hidden single image input
    const selectFolderBtn = document.getElementById("select-folder-btn"); // Get the select folder button
    const imageGrid = document.getElementById("image-grid"); // Get the image grid container

    const textToImageRadio = document.getElementById('text-to-image-radio');
    const imageToImageRadio = document.getElementById('image-to-image-radio');
    const textImageRefRadio = document.getElementById('text-image-ref-radio'); // Get the new radio button

    const promptInputContainer = document.getElementById('prompt-input-container'); // Get the prompt input container

    let currentMode = 'general'; // 'general' or 'poster'
    let currentGeneralSubMode = 'text-to-image'; // 'text-to-image', 'image-to-image', or 'text-image-reference'

    let selectedInitImage = null; // Variable to store the currently selected image element (from single select or grid)

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
                selectSingleImageBtn.style.display = 'none'; // Hide single image select button
                selectFolderBtn.style.display = 'none';
                imageGrid.style.display = 'none';
                promptInputContainer.style.display = 'block'; // Show prompt
            } else if (currentGeneralSubMode === 'image-to-image') {
                selectSingleImageBtn.style.display = 'block'; // Show single image select button
                selectFolderBtn.style.display = 'block'; // Show folder select button
                imageGrid.style.display = 'flex'; // Show image grid
                promptInputContainer.style.display = 'none'; // Hide prompt
            } else { // text-image-reference
                selectSingleImageBtn.style.display = 'block'; // Show single image select button
                selectFolderBtn.style.display = 'block'; // Show folder select button
                imageGrid.style.display = 'flex'; // Show image grid
                promptInputContainer.style.display = 'block'; // Show prompt
            }
        } else { // poster
            generalModeInputs.style.display = 'none';
            posterModeInputs.style.display = 'block';
            // Decide visibility for image selection options and prompt in poster mode if needed
            // For now, let's assume single image select, folder select, image grid, and prompt are all visible
             selectSingleImageBtn.style.display = 'block';
             selectFolderBtn.style.display = 'block';
             imageGrid.style.display = 'flex';
             promptInputContainer.style.display = 'block'; // Show prompt in poster mode
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
             selectedInitImage = null; // Deselect image when switching modes
             imageGrid.innerHTML = ''; // Clear image grid
        }
        updateUIVisibility();
    });

    // Event listeners for general sub-mode radio buttons
    textToImageRadio.addEventListener('change', () => {
        if (textToImageRadio.checked) {
            currentGeneralSubMode = 'text-to-image';
            selectedInitImage = null; // Deselect any image when switching away from image modes
            imageGrid.innerHTML = ''; // Clear image grid
            updateUIVisibility();
        }
    });

    imageToImageRadio.addEventListener('change', () => {
        if (imageToImageRadio.checked) {
            currentGeneralSubMode = 'image-to-image';
            promptInput.value = ''; // Clear prompt when switching to image-only mode
             selectedInitImage = null; // Deselect any image when switching sub-modes
             imageGrid.innerHTML = ''; // Clear image grid
            updateUIVisibility();
        }
    });

    textImageRefRadio.addEventListener('change', () => {
        if (textImageRefRadio.checked) {
            currentGeneralSubMode = 'text-image-reference';
             selectedInitImage = null; // Deselect any image when switching sub-modes
             imageGrid.innerHTML = ''; // Clear image grid
            updateUIVisibility();
        }
    });

    // Event listener for the select single image button
    selectSingleImageBtn.addEventListener('click', () => {
        singleImageInput.click(); // Trigger the hidden file input click
    });

    // Event listener for the hidden single image file input
    singleImageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            // Clear previous images from the grid and deselect any image
            imageGrid.innerHTML = '';
            selectedInitImage = null;

            const reader = new FileReader();
            reader.onload = (e) => {
                const imgElement = document.createElement('img');
                imgElement.src = e.target.result;
                imgElement.alt = file.name; // Use file name as alt text
                imgElement.classList.add('thumbnail', 'selected'); // Add thumbnail and selected class

                // Add a click listener to deselect the image if clicked again
                imgElement.addEventListener('click', () => {
                    imgElement.classList.remove('selected');
                    selectedInitImage = null;
                    // Remove the image element from the DOM when deselected
                    imgElement.remove();
                    console.log('Deselected image:', file.name);
                });

                imageGrid.appendChild(imgElement);
                selectedInitImage = imgElement; // Set the newly selected single image element

                console.log('Selected single image:', file.name);
            };
            reader.readAsDataURL(file); // Read the file as a data URL to display it
        }
         // Clear the file input value so selecting the same file again triggers the change event
         event.target.value = '';
    });

    // Event listener for the select folder button
    selectFolderBtn.addEventListener('click', () => {
        // Only allow folder selection in image-to-image or text-image-reference general sub-modes, or in poster mode
        if (currentMode === 'general' && (currentGeneralSubMode === 'image-to-image' || currentGeneralSubMode === 'text-image-reference')) {
             ipcRenderer.send('open-directory-dialog'); // Send message to main process
        } else if (currentMode === 'poster') {
             ipcRenderer.send('open-directory-dialog'); // Allow folder selection in poster mode too
        }
    });

    // IPC listener for receiving the selected directory path
    ipcRenderer.on('selected-directory', (event, directoryPath) => {
        if (directoryPath) {
            console.log('Selected directory:', directoryPath);
            // Clear any previously selected single image or images from previous folder selection
            imageGrid.innerHTML = '';
            selectedInitImage = null;
            displayImagesFromDirectory(directoryPath);
        } else {
            console.log('Directory selection canceled.');
            imageGrid.innerHTML = '<p>No directory selected.</p>';
             selectedInitImage = null; // Ensure no image is considered selected if folder selection is canceled
        }
    });

    // Function to read images from a directory and display them
    function displayImagesFromDirectory(directoryPath) {
        // Clear previous images (including any single selected image)
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

                // Add click listener to select the image from the grid
                imgElement.addEventListener('click', () => {
                    // Deselect previously selected image from either single select or grid
                    if (selectedInitImage) {
                        selectedInitImage.classList.remove('selected');
                         // If the previously selected image was from single select, remove it from the DOM
                         if (selectedInitImage.parentElement === imageGrid && selectedInitImage !== imgElement) {
                              imageGrid.removeChild(selectedInitImage);
                         }
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
        // Get the file path/data URL from the selected image element, if any, only if in a mode requiring an initial image
        const initImageSrc = (currentMode === 'general' && (currentGeneralSubMode === 'image-to-image' || currentGeneralSubMode === 'text-image-reference') && selectedInitImage) ||
                             (currentMode === 'poster' && selectedInitImage)
                             ? selectedInitImage.src : null;

        // Basic validation based on the selected mode and sub-mode
        if (currentMode === 'general') {
            if (currentGeneralSubMode === 'text-to-image' && !prompt) {
                alert("Please enter a prompt for Text to Image generation.");
                return;
            } else if ((currentGeneralSubMode === 'image-to-image' || currentGeneralSubMode === 'text-image-reference') && !selectedInitImage) {
                 alert("Please select an initial image.");
                 return;
            } else if (currentGeneralSubMode === 'text-image-reference' && !prompt) {
                 alert("Please enter a prompt for Text and Image Reference generation.");
                 return;
            }

        } else if (currentMode === 'poster'){
             const posterHeadline = document.getElementById('poster-headline').value;
             // Add more specific validation for poster mode inputs if needed
             if (!prompt || !posterHeadline) {
                 alert("Please enter a prompt and a headline for Poster generation.");
                 return;
             }
             // TODO: Consider if an initial image should be required for poster mode
        }

        // Need to convert image source (file path or data URL) to a File object for FormData, only if in a mode requiring an initial image
        let initImageFileObject = null;
        if (initImageSrc && ( (currentMode === 'general' && (currentGeneralSubMode === 'image-to-image' || currentGeneralSubMode === 'text-image-reference')) || currentMode === 'poster')) {
             try {
                // For file paths (from folder selection), we use fetch to get a blob
                // For data URLs (from single file select), we can directly create a blob
                let blob;
                let fileName;
                if (initImageSrc.startsWith('data:')) {
                    const byteCharacters = atob(initImageSrc.split(',')[1]);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const mimeString = initImageSrc.split(',')[0].split(':')[1].split(';')[0];
                    blob = new Blob([byteArray], { type: mimeString });
                    // Try to get filename from the selected image element's alt text if available
                    fileName = selectedInitImage.alt && selectedInitImage.alt !== '' ? selectedInitImage.alt : 'uploaded_image.png'; // Use a default if no alt text
                } else {
                    // Existing logic for file paths from folder selection
                    const response = await fetch(initImageSrc);
                    blob = await response.blob();
                    fileName = path.basename(initImageSrc);
                }

                initImageFileObject = new File([blob], fileName, { type: blob.type });

             } catch (error) {
                console.error("Error fetching or processing image file:", error);
                imageContainer.innerHTML = '<p>Error loading or processing initial image.</p>';
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
        if (currentMode === 'general' && (currentGeneralSubMode === 'image-to-image' || currentGeneralSubMode === 'text-image-reference') && initImageFileObject) {
            // Image-to-image or Text and Image Reference generation
            apiEndpoint = `${API_BASE_URL}/${ENGINE_ID}/image-to-image`;

            const formData = new FormData();
            formData.append('init_image', initImageFileObject); // Append the File object

            // Include text prompts: use user prompt if available, otherwise a default for image modes
            const textPromptToSend = (prompt && prompt.trim() !== '') ? prompt.trim() : 'generate image based on input'; // Use user prompt or a default
            formData.append('text_prompts[0][text]', textPromptToSend);
            // Optionally add weight if needed, e.g., formData.append('text_prompts[0][weight]', '1');

            // Add other parameters as needed, e.g., steps, cfg_scale, etc.
            // Use image_strength for image-to-image influence
            formData.append('image_strength', '0.5'); // Corrected parameter name
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
             // For now, just using the main prompt and potentially an initial image
             apiEndpoint = `${API_BASE_URL}/${ENGINE_ID}/text-to-image`; // Or potentially image-to-image if using an initial image
             headers['Content-Type'] = 'application/json'; // Default for text-to-image

             const posterHeadline = document.getElementById('poster-headline').value;
             const posterBodyText = document.getElementById('poster-body-text').value;
             const posterStyle = document.getElementById('poster-style').value;

             // Example of constructing a prompt for poster mode (needs refinement)
             const posterPrompt = `Aged poster style. Headline: ${posterHeadline}. Body text: ${posterBodyText}. Style: ${posterStyle}. ${prompt}`.trim();

             if (selectedInitImage) {
                  // If an initial image is selected in poster mode, use image-to-image endpoint
                 apiEndpoint = `${API_BASE_URL}/${ENGINE_ID}/image-to-image`;
                 const formData = new FormData();
                 // Need to get the File object for the selected image in poster mode
                 // Re-using the logic from general image modes to get the File object
                 let posterInitImageFileObject = null;
                 try {
                    let blob;
                    let fileName;
                    const initImageFileSrc = selectedInitImage.src;
                    if (initImageFileSrc.startsWith('data:')) {
                        const byteCharacters = atob(initImageFileSrc.split(',')[1]);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const mimeString = initImageFileSrc.split(',')[0].split(':')[1].split(';')[0];
                        blob = new Blob([byteArray], { type: mimeString });
                        fileName = selectedInitImage.alt && selectedInitImage.alt !== '' ? selectedInitImage.alt : 'uploaded_image.png';
                    } else {
                        const response = await fetch(initImageFileSrc);
                        blob = await response.blob();
                        fileName = path.basename(initImageFileSrc);
                    }
                    posterInitImageFileObject = new File([blob], fileName, { type: blob.type });

                 } catch (error) {
                    console.error("Error fetching or processing poster initial image file:", error);
                    imageContainer.innerHTML = '<p>Error loading or processing poster initial image.</p>';
                    return;
                 }

                 formData.append('init_image', posterInitImageFileObject); // Append the File object
                 // Always include text_prompts in poster image-to-image mode, use the constructed prompt
                 formData.append('text_prompts[0][text]', posterPrompt); 
                 formData.append('image_strength', '0.7'); // Use image_strength in poster image-to-image mode
                 // Add other parameters for poster mode as needed

                 requestBody = formData;
                 // Content-Type is automatically set to multipart/form-data for FormData

             } else {
                  // If no initial image is selected in poster mode, use text-to-image endpoint
                  requestBody = JSON.stringify({
                      text_prompts: [{ text: posterPrompt }],
                      cfg_scale: 7,
                      height: 512,
                      width: 512,
                      samples: 1,
                      steps: 30,
                  });
             }

        } else {
             // Should not happen with current logic, but as a fallback
             console.error("Unknown mode or sub-mode combination.");
             imageContainer.innerHTML = "<p>Error: Invalid mode selection.</p>";
             return;
        }


        try {
            // Determine the Content-Type header based on the requestBody type
            if (requestBody instanceof FormData) {
                 // No Content-Type header needed for FormData, fetch sets it automatically
                 delete headers['Content-Type'];
            } else {
                 headers['Content-Type'] = 'application/json';
            }

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