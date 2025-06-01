// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const { ipcRenderer } = require('electron'); // Import ipcRenderer
const fs = require('fs'); // Import file system module
const path = require('path'); // Import path module

document.addEventListener("DOMContentLoaded", () => {
    const promptInput = document.getElementById("prompt");
    const generateBtn = document.getElementById("generate-btn");
    const generatedPreview = document.getElementById("generated-preview"); // Updated reference
    const referencePreview = document.getElementById("reference-preview"); // New reference

    const generalModeInputs = document.getElementById('general-mode-inputs');
    const posterModeInputs = document.getElementById('poster-mode-inputs');
    const modeSwitchBtn = document.getElementById("mode-switch-btn"); // Get the mode switch button

    const selectSingleImageBtn = document.getElementById('select-single-image-btn'); // Get the select single image button
    const singleImageInput = document.getElementById('single-image-input'); // Get the hidden single image input
    const selectFolderBtn = document.getElementById("select-folder-btn"); // Get the select folder button
    const imageGrid = document.getElementById("image-grid"); // Get the image grid container
    const setDefaultFolderBtn = document.getElementById('set-default-folder-btn'); // Get the new button

    const textToImageRadio = document.getElementById('text-to-image-radio');
    const imageToImageRadio = document.getElementById('image-to-image-radio');
    const textImageRefRadio = document.getElementById('text-image-ref-radio'); // Get the new radio button

    const promptInputContainer = document.getElementById('prompt-input-container'); // Get the prompt input container

    const advancedOptionsToggle = document.getElementById('advanced-options-toggle');
    const advancedOptionsDiv = document.getElementById('advanced-options');
    const cfgScaleInput = document.getElementById('cfg-scale');
    const stepsInput = document.getElementById('steps');
    const samplesInput = document.getElementById('samples');
    const seedInput = document.getElementById('seed');
    const imageStrengthControl = document.getElementById('image-strength-control');
    const imageStrengthInput = document.getElementById('image-strength');

    // Poster mode elements
    const posterStyleInput = document.getElementById('poster-style');

    // Reference image controls (for poster mode)
    const referenceImageControls = document.getElementById('reference-image-controls');
    const refSelectSingleImageBtn = document.getElementById('ref-select-single-image-btn');
    const refSingleImageInput = document.getElementById('ref-single-image-input');
    const refSelectFolderBtn = document.getElementById('ref-select-folder-btn');
    const refSetDefaultFolderBtn = document.getElementById('ref-set-default-folder-btn');
    const referenceImageGrid = document.getElementById('reference-image-grid');

    let currentMode = 'general'; // 'general' or 'poster'
    let currentGeneralSubMode = 'image-to-image'; // 'text-to-image', 'image-to-image', or 'text-image-reference'

    let selectedInitImage = null; // Variable to store the currently selected image element (from single select or grid)
    let selectedReferenceImage = null; // Variable to store the currently selected reference image (for poster mode)

    // Function to show reference image preview
    function showReferencePreview(imageSrc) {
        referencePreview.innerHTML = ''; // Clear previous preview
        if (imageSrc) {
            const imgElement = document.createElement('img');
            imgElement.src = imageSrc;
            imgElement.alt = 'Reference image preview';
            referencePreview.appendChild(imgElement);
        }
    }

    // Function to clear reference image preview
    function clearReferencePreview() {
        referencePreview.innerHTML = '';
    }

    // Function to handle poster type selection
    function handlePosterTypeChange() {
        const posterTypeRadios = document.querySelectorAll('input[name="poster-type"]');
        posterTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === 'custom') {
                    posterStyleInput.classList.add('enabled');
                    posterStyleInput.placeholder = 'Describe your custom poster style...';
                } else {
                    posterStyleInput.classList.remove('enabled');
                    posterStyleInput.placeholder = 'Custom style description (only for Custom Style option)...';
                    posterStyleInput.value = '';
                }
            });
        });
    }

    // Function to get selected poster type
    function getSelectedPosterType() {
        const selectedType = document.querySelector('input[name="poster-type"]:checked');
        return selectedType ? selectedType.value : 'event';
    }

    // Function to generate poster prompt based on selections
    function generatePosterPrompt() {
        const posterType = getSelectedPosterType();
        const headline = document.getElementById('poster-headline').value;
        const bodyText = document.getElementById('poster-body-text').value;
        const customStyle = document.getElementById('poster-style').value;
        const colorScheme = document.getElementById('poster-color-scheme').value;
        const era = document.getElementById('poster-era').value;
        const basePrompt = promptInput.value;

        let styleDescription = '';
        
        // Define style based on poster type
        switch(posterType) {
            case 'event':
                styleDescription = 'vibrant event poster, concert style, festival aesthetic, bold typography, energetic design';
                break;
            case 'movie':
                styleDescription = 'cinematic movie poster, dramatic lighting, professional film poster design, compelling composition';
                break;
            case 'vintage':
                styleDescription = 'vintage poster design, retro aesthetic, aged paper texture, classic typography, nostalgic feel';
                break;
            case 'propaganda':
                styleDescription = 'propaganda poster style, bold political design, strong messaging, powerful imagery, motivational';
                break;
            case 'art-deco':
                styleDescription = 'Art Deco poster, geometric patterns, elegant lines, 1920s style, sophisticated design, gold accents';
                break;
            case 'minimalist':
                styleDescription = 'minimalist poster design, clean lines, simple composition, modern typography, white space';
                break;
            case 'travel':
                styleDescription = 'travel poster, tourism promotion, destination marketing, scenic beauty, wanderlust inspiring';
                break;
            case 'horror':
                styleDescription = 'horror movie poster, dark atmosphere, scary imagery, thriller aesthetic, dramatic shadows';
                break;
            case 'sci-fi':
                styleDescription = 'science fiction poster, futuristic design, space theme, technological elements, neon colors';
                break;
            case 'custom':
                styleDescription = customStyle || 'custom poster design';
                break;
        }

        // Add color scheme
        if (colorScheme !== 'auto') {
            const colorDescriptions = {
                'vintage-sepia': 'vintage sepia tones, warm browns, aged color palette',
                'black-white': 'black and white, monochrome, high contrast',
                'neon-bright': 'neon colors, bright fluorescent tones, vibrant palette',
                'dark-moody': 'dark moody colors, deep shadows, dramatic lighting',
                'warm-earth': 'warm earth tones, browns, oranges, natural colors',
                'cool-blue': 'cool blue palette, cyan tones, icy colors',
                'red-dominant': 'red dominant color scheme, bold reds, dramatic contrast'
            };
            styleDescription += ', ' + colorDescriptions[colorScheme];
        }

        // Add era
        if (era !== 'modern') {
            const eraDescriptions = {
                'retro': '1980s-90s retro style, nostalgic design',
                'vintage': '1950s-70s vintage aesthetic, classic mid-century design',
                'classic': '1920s-40s classic style, golden age design',
                'victorian': 'Victorian era style, ornate design, classical elements',
                'futuristic': 'futuristic design, advanced technology aesthetic'
            };
            styleDescription += ', ' + eraDescriptions[era];
        }

        // Construct final prompt
        let finalPrompt = `${styleDescription} poster`;
        
        if (headline) {
            finalPrompt += `, headline: "${headline}"`;
        }
        
        if (bodyText) {
            finalPrompt += `, text: "${bodyText}"`;
        }
        
        if (basePrompt) {
            finalPrompt += `, ${basePrompt}`;
        }

        finalPrompt += ', high quality, professional design, poster layout';

        return finalPrompt;
    }

    // Initialize poster type handling
    handlePosterTypeChange();

    // WARNING: Storing API key directly in renderer is not secure.
    // This should be handled in the main process or a secure backend.
    const STABILITY_API_KEY = "sk-CD8RJ7DR7WyaAIBkT4knZGQ8kjOlAv92ZmBgAeZmhQ8elRGG"; // Replace with your actual API key
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
            referenceImageControls.style.display = 'none'; // Hide reference controls in general mode

            if (currentGeneralSubMode === 'text-to-image') {
                selectSingleImageBtn.style.display = 'none'; // Hide single image select button
                selectFolderBtn.style.display = 'none';
                imageGrid.style.display = 'none';
                promptInputContainer.style.display = 'block'; // Show prompt
                setDefaultFolderBtn.style.display = 'none'; // Hide set default button in text-to-image mode
            } else if (currentGeneralSubMode === 'image-to-image') {
                selectSingleImageBtn.style.display = 'block'; // Show single image select button
                selectFolderBtn.style.display = 'block'; // Show folder select button
                imageGrid.style.display = 'flex'; // Show image grid
                promptInputContainer.style.display = 'none'; // Hide prompt
                setDefaultFolderBtn.style.display = 'block'; // Show set default button in image modes
            } else { // text-image-reference
                selectSingleImageBtn.style.display = 'block'; // Show single image select button
                selectFolderBtn.style.display = 'block'; // Show folder select button
                imageGrid.style.display = 'flex'; // Show image grid
                promptInputContainer.style.display = 'block'; // Show prompt
                setDefaultFolderBtn.style.display = 'block'; // Show set default button in image modes
            }
        } else { // poster
            generalModeInputs.style.display = 'none';
            posterModeInputs.style.display = 'block';
            referenceImageControls.style.display = 'block'; // Show reference controls in poster mode
            
            // Hide main image selection controls in poster mode since we use reference image controls
            selectSingleImageBtn.style.display = 'none';
            selectFolderBtn.style.display = 'none';
            imageGrid.style.display = 'none';
            setDefaultFolderBtn.style.display = 'none';
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
            clearReferencePreview(); // Clear reference preview when switching modes
        } else {
            currentMode = 'general';
            modeSwitchBtn.textContent = 'Switch to Poster Mode';
            console.log('Switched to General Mode');
             // Reset general sub-mode to default when switching back
             currentGeneralSubMode = 'image-to-image';
             imageToImageRadio.checked = true;
             selectedInitImage = null; // Deselect image when switching modes
             imageGrid.innerHTML = ''; // Clear image grid
             clearReferencePreview(); // Clear reference preview when switching modes
             
             // Clear reference image selection when leaving poster mode
             selectedReferenceImage = null;
             referenceImageGrid.innerHTML = '';
        }
        updateUIVisibility();
    });

    // Event listeners for general sub-mode radio buttons
    textToImageRadio.addEventListener('change', () => {
        if (textToImageRadio.checked) {
            currentGeneralSubMode = 'text-to-image';
            selectedInitImage = null; // Deselect any image when switching away from image modes
            imageGrid.innerHTML = ''; // Clear image grid
            clearReferencePreview(); // Clear reference preview when switching to text-only mode
            updateUIVisibility();
        }
    });

    imageToImageRadio.addEventListener('change', () => {
        if (imageToImageRadio.checked) {
            currentGeneralSubMode = 'image-to-image';
            promptInput.value = ''; // Clear prompt when switching to image-only mode
             selectedInitImage = null; // Deselect any image when switching sub-modes
             imageGrid.innerHTML = ''; // Clear image grid
             clearReferencePreview(); // Clear reference preview when switching sub-modes
            updateUIVisibility();
        }
    });

    textImageRefRadio.addEventListener('change', () => {
        if (textImageRefRadio.checked) {
            currentGeneralSubMode = 'text-image-reference';
             selectedInitImage = null; // Deselect any image when switching sub-modes
             imageGrid.innerHTML = ''; // Clear image grid
             clearReferencePreview(); // Clear reference preview when switching sub-modes
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
                    
                    // Clear reference preview when deselecting
                    clearReferencePreview();
                });

                imageGrid.appendChild(imgElement);
                selectedInitImage = imgElement; // Set the newly selected single image element
                
                // Show preview of selected reference image
                showReferencePreview(e.target.result);

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

    // Event listener for the set default folder button
    setDefaultFolderBtn.addEventListener('click', () => {
        // Trigger the set default directory dialog in the main process
        ipcRenderer.send('set-default-directory');
    });

    // IPC listener for receiving the selected directory path (for browsing)
    ipcRenderer.on('selected-directory', (event, directoryPath) => {
        if (directoryPath) {
            console.log('Selected directory:', directoryPath);
            // Clear any previously selected single image or images from previous folder selection
            imageGrid.innerHTML = '';
            selectedInitImage = null;
            clearReferencePreview(); // Clear reference preview when loading new folder
            displayImagesFromDirectory(directoryPath);
        } else {
            console.log('Directory selection canceled.');
            imageGrid.innerHTML = '<p>No directory selected.</p>';
             selectedInitImage = null; // Ensure no image is considered selected if folder selection is canceled
        }
    });

    // IPC listener for loading the default directory on startup
    ipcRenderer.on('load-default-directory', (event, directoryPath) => {
        if (directoryPath) {
            console.log('Loading default directory:', directoryPath);
            // Automatically display images from the default directory
            displayImagesFromDirectory(directoryPath);
             // Select the Image to Image radio button by default if a default folder is loaded
             imageToImageRadio.checked = true;
             currentGeneralSubMode = 'image-to-image';
             updateUIVisibility(); // Update UI to show image selection elements
        }
    });

    // Optional: IPC listener for confirmation after setting default directory
    ipcRenderer.on('default-directory-set', (event, directoryPath) => {
        if (directoryPath) {
            console.log('Successfully set default folder:', directoryPath);
            // You could add a visual confirmation to the user here
        } else {
            console.log('Setting default folder canceled.');
        }
    });

    // Function to read images from a directory and display them
    function displayImagesFromDirectory(directoryPath) {
        // Clear previous images (including any single selected image)
        imageGrid.innerHTML = '';
        selectedInitImage = null; // Reset selected image
        clearReferencePreview(); // Clear reference preview when loading new directory

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
                    
                    // Show preview of selected reference image
                    showReferencePreview(imgElement.src);
                });

                imageGrid.appendChild(imgElement);
            });
        });
    }

    generateBtn.addEventListener("click", async () => {
        const prompt = promptInput.value;
        // Get the file path/data URL from the selected image element, if any, only if in a mode requiring an initial image
        const initImageSrc = (currentMode === 'general' && (currentGeneralSubMode === 'image-to-image' || currentGeneralSubMode === 'text-image-reference') && selectedInitImage) ||
                             (currentMode === 'poster' && selectedReferenceImage)
                             ? (currentMode === 'poster' ? selectedReferenceImage.src : selectedInitImage.src) : null;

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
        } else if (currentMode === 'poster') {
             const posterHeadline = document.getElementById('poster-headline').value;
             // Only require headline for poster mode, prompt is auto-generated
             if (!posterHeadline) {
                 alert("Please enter a headline for Poster generation.");
                 return;
             }
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
                    fileName = (currentMode === 'poster' && selectedReferenceImage) 
                        ? (selectedReferenceImage.alt && selectedReferenceImage.alt !== '' ? selectedReferenceImage.alt : 'reference_image.png')
                        : (selectedInitImage.alt && selectedInitImage.alt !== '' ? selectedInitImage.alt : 'uploaded_image.png');
                } else {
                    const response = await fetch(initImageSrc);
                    blob = await response.blob();
                    fileName = path.basename(initImageSrc);
                }

                initImageFileObject = new File([blob], fileName, { type: blob.type });

             } catch (error) {
                console.error("Error fetching or processing image file:", error);
                generatedPreview.innerHTML = '<p>Error loading or processing initial image.</p>';
                return;
             }
        }

        console.log("Generating image...");
        generatedPreview.innerHTML = "<p>Generating...</p>";

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
            formData.append('init_image', initImageFileObject);
            const textPromptToSend = (prompt && prompt.trim() !== '') ? prompt.trim() : 'generate image based on input';
            formData.append('text_prompts[0][text]', textPromptToSend);
            formData.append('image_strength', '0.5');

            requestBody = formData;
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
            // Poster generation mode using the enhanced poster prompt generation
            const posterPrompt = generatePosterPrompt();
            
            if (selectedReferenceImage && initImageFileObject) {
                // If a reference image is selected in poster mode, use image-to-image endpoint
                apiEndpoint = `${API_BASE_URL}/${ENGINE_ID}/image-to-image`;
                const formData = new FormData();
                formData.append('init_image', initImageFileObject);
                formData.append('text_prompts[0][text]', posterPrompt); 
                formData.append('image_strength', '0.7');
                requestBody = formData;
            } else {
                // If no reference image is selected in poster mode, use text-to-image endpoint
                apiEndpoint = `${API_BASE_URL}/${ENGINE_ID}/text-to-image`;
                headers['Content-Type'] = 'application/json';
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
             generatedPreview.innerHTML = "<p>Error: Invalid mode selection.</p>";
             return;
        }

        // Determine the Content-Type header based on the requestBody type
        if (requestBody instanceof FormData) {
             // No Content-Type header needed for FormData, fetch sets it automatically
             delete headers['Content-Type'];
        } else {
             headers['Content-Type'] = 'application/json';
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
                generatedPreview.innerHTML = ''; // Clear loading text
                responseJSON.artifacts.forEach((image, index) => {
                    const imgElement = document.createElement("img");
                    imgElement.src = `data:image/png;base64,${image.base64}`; // Assuming PNG base64 based on docs
                    imgElement.alt = `Generated image ${index + 1}`;
                    generatedPreview.appendChild(imgElement);
                });
            }
             else {
                generatedPreview.innerHTML = "<p>Error: Could not generate image or receive valid response.</p>";
            }

        } catch (error) {
            console.error("Error generating image:", error);
            generatedPreview.innerHTML = `<p>Error: ${error.message}</p>`;
        }
    });

    // Event listener for the advanced options toggle
    advancedOptionsToggle.addEventListener('change', () => {
        if (advancedOptionsToggle.checked) {
            advancedOptionsDiv.style.display = 'block'; // Or 'flex' or 'grid' as needed
        } else {
            advancedOptionsDiv.style.display = 'none';
        }
    });

    // Reference image controls event listeners (for poster mode)
    refSelectSingleImageBtn.addEventListener('click', () => {
        refSingleImageInput.click();
    });

    refSingleImageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            referenceImageGrid.innerHTML = '';
            selectedReferenceImage = null;

            const reader = new FileReader();
            reader.onload = (e) => {
                const imgElement = document.createElement('img');
                imgElement.src = e.target.result;
                imgElement.alt = file.name;
                imgElement.classList.add('thumbnail', 'selected');

                imgElement.addEventListener('click', () => {
                    imgElement.classList.remove('selected');
                    selectedReferenceImage = null;
                    imgElement.remove();
                    clearReferencePreview();
                    console.log('Deselected reference image:', file.name);
                });

                referenceImageGrid.appendChild(imgElement);
                selectedReferenceImage = imgElement;
                showReferencePreview(e.target.result);
                console.log('Selected reference image:', file.name);
            };
            reader.readAsDataURL(file);
        }
        event.target.value = '';
    });

    refSelectFolderBtn.addEventListener('click', () => {
        if (currentMode === 'poster') {
            ipcRenderer.send('open-reference-directory-dialog');
        }
    });

    refSetDefaultFolderBtn.addEventListener('click', () => {
        if (currentMode === 'poster') {
            ipcRenderer.send('set-reference-default-directory');
        }
    });

    // IPC listener for reference directory selection
    ipcRenderer.on('selected-reference-directory', (event, directoryPath) => {
        if (directoryPath) {
            console.log('Selected reference directory:', directoryPath);
            referenceImageGrid.innerHTML = '';
            selectedReferenceImage = null;
            clearReferencePreview();
            displayReferenceImagesFromDirectory(directoryPath);
        } else {
            console.log('Reference directory selection canceled.');
            referenceImageGrid.innerHTML = '<p>No directory selected.</p>';
            selectedReferenceImage = null;
        }
    });

    // Function to display reference images from directory
    function displayReferenceImagesFromDirectory(directoryPath) {
        referenceImageGrid.innerHTML = '';
        selectedReferenceImage = null;
        clearReferencePreview();

        fs.readdir(directoryPath, (err, files) => {
            if (err) {
                console.error('Error reading reference directory:', err);
                referenceImageGrid.innerHTML = '<p>Error reading directory.</p>';
                return;
            }

            const imageFiles = files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].includes(ext);
            });

            if (imageFiles.length === 0) {
                referenceImageGrid.innerHTML = '<p>No image files found in this directory.</p>';
                return;
            }

            imageFiles.forEach(file => {
                const imgPath = path.join(directoryPath, file);
                const imgElement = document.createElement('img');
                imgElement.src = imgPath;
                imgElement.alt = file;
                imgElement.classList.add('thumbnail');

                imgElement.addEventListener('click', () => {
                    if (selectedReferenceImage) {
                        selectedReferenceImage.classList.remove('selected');
                    }
                    imgElement.classList.add('selected');
                    selectedReferenceImage = imgElement;
                    showReferencePreview(imgElement.src);
                    console.log('Selected reference image:', imgPath);
                });

                referenceImageGrid.appendChild(imgElement);
            });
        });
    }
}); 