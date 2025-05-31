document.addEventListener("DOMContentLoaded", () => {
    const promptInput = document.getElementById("prompt");
    const generateBtn = document.getElementById("generate-btn");
    const imageContainer = document.getElementById("image-container");

    generateBtn.addEventListener("click", () => {
        const prompt = promptInput.value;
        if (prompt) {
            console.log("Generating image for prompt:", prompt);
            // TODO: Call Stability AI API here
            // Display loading state
            imageContainer.innerHTML = "<p>Generating...</p>";
        } else {
            alert("Please enter a prompt.");
        }
    });
}); 