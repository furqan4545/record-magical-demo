// document.addEventListener("DOMContentLoaded", async () => {
//   const videoPlayer = document.getElementById("videoPlayer");
//   const loading = document.getElementById("loading");
//   const error = document.getElementById("error");
//   const videoInfo = document.getElementById("videoInfo");

//   // Get video key from URL parameters
//   const urlParams = new URLSearchParams(window.location.search);
//   const videoKey = urlParams.get("key");

//   if (!videoKey) {
//     showError("No video key provided");
//     return;
//   }

//   try {
//     const response = await fetch(
//       `http://localhost:3500/get-video-url/${encodeURIComponent(videoKey)}`
//     );
//     if (!response.ok) {
//       throw new Error(`Server responded with ${response.status}`);
//     }

//     const data = await response.json();
//     if (!data.url) {
//       throw new Error("No video URL received");
//     }

//     // Set up video player
//     videoPlayer.src = data.url;
//     videoPlayer.style.display = "block";
//     loading.style.display = "none";

//     // Show video info
//     const fileName = videoKey.split("/").pop();
//     const recordedDate = new Date().toLocaleString();
//     videoInfo.innerHTML = `
//       <p><strong>File:</strong> ${fileName}</p>
//       <p><strong>Recorded:</strong> ${recordedDate}</p>
//       <p><strong>Location:</strong> stub/mybucket/${fileName}</p>
//     `;

//     // Handle video errors
//     videoPlayer.onerror = () => {
//       showError("Failed to load video. Please try again.");
//     };

//     // Auto-play when ready
//     videoPlayer.play().catch((e) => {
//       console.log("Auto-play prevented:", e);
//     });
//   } catch (error) {
//     showError(`Error loading video: ${error.message}`);
//     console.error("Error:", error);
//   }

//   function showError(message) {
//     loading.style.display = "none";
//     error.textContent = message;
//     error.style.display = "block";
//   }
// });

document.addEventListener("DOMContentLoaded", async () => {
  const videoPlayer = document.getElementById("videoPlayer");
  const loading = document.getElementById("loading");
  const error = document.getElementById("error");
  const videoInfo = document.getElementById("videoInfo");

  function showError(message) {
    loading.style.display = "none";
    error.textContent = message;
    error.style.display = "block";
  }

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const videoKey = urlParams.get("key");

    if (!videoKey) {
      showError("No video key provided");
      return;
    }

    console.log("Fetching video URL for:", videoKey);
    const response = await fetch(
      `http://localhost:3500/get-video-url/${encodeURIComponent(videoKey)}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Server responded with ${response.status}: ${
          errorData.details || errorData.error || "Unknown error"
        }`
      );
    }

    const data = await response.json();
    if (!data.url) {
      throw new Error("No video URL received");
    }

    // Set up video player
    videoPlayer.src = data.url;
    videoPlayer.style.display = "block";
    loading.style.display = "none";

    // Show video info
    const fileName = videoKey.split("/").pop();
    const recordedDate = new Date().toLocaleString();
    videoInfo.innerHTML = `
      <p><strong>File:</strong> ${fileName}</p>
      <p><strong>Recorded:</strong> ${recordedDate}</p>
      <p><strong>Location:</strong> ${videoKey}</p>
    `;

    videoPlayer.addEventListener("error", (e) => {
      console.error("Video error:", videoPlayer.error);
      showError(`Error playing video: ${videoPlayer.error.message}`);
    });

    // Try autoplay
    try {
      await videoPlayer.play();
    } catch (e) {
      console.log("Autoplay prevented:", e);
    }
  } catch (error) {
    console.error("Error:", error);
    showError(error.message);
  }
});
