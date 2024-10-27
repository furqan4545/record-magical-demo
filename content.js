// // content.js
// let cameraContainer = null;
// let videoElement = null;
// let cameraStream = null;

// // Set up message listener
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === "toggleRecording") {
//     if (!cameraContainer) {
//       startCamera();
//     } else {
//       stopCamera();
//     }
//     sendResponse({ success: true });
//     return true;
//   } else if (request.action === "download-recording") {
//     try {
//       const a = document.createElement("a");
//       a.style.display = "none";
//       a.href = request.url;
//       a.download = "screen-recording.webm";
//       document.body.appendChild(a);
//       a.click();

//       // Cleanup
//       setTimeout(() => {
//         document.body.removeChild(a);
//         URL.revokeObjectURL(request.url);
//       }, 100);

//       sendResponse({ success: true });
//     } catch (error) {
//       console.error("Download error:", error);
//       sendResponse({ success: false, error: error.message });
//     }
//     return true;
//   }
// });

// async function startCamera() {
//   try {
//     // Request only video permission for camera
//     cameraStream = await navigator.mediaDevices.getUserMedia({
//       video: true,
//       audio: false, // Don't need audio for camera feed
//     });

//     // Create camera container
//     cameraContainer = document.createElement("div");
//     cameraContainer.style.cssText = `
//       position: fixed;
//       top: 20px;
//       right: 20px;
//       width: 200px;
//       height: 200px;
//       border-radius: 50%;
//       overflow: hidden;
//       z-index: 9999;
//       border: 3px solid #2196F3;
//     `;

//     // Create video element
//     videoElement = document.createElement("video");
//     videoElement.style.cssText = `
//       width: 100%;
//       height: 100%;
//       object-fit: cover;
//     `;
//     videoElement.autoplay = true;
//     videoElement.muted = true;
//     videoElement.srcObject = cameraStream;

//     cameraContainer.appendChild(videoElement);
//     document.body.appendChild(cameraContainer);

//     // Update popup button - camera is active
//     chrome.runtime.sendMessage({ action: "updateButton", isRecording: true });
//   } catch (error) {
//     console.error("Error accessing camera:", error);
//     alert("Error accessing camera. Please check permissions.");
//   }
// }

// function stopCamera() {
//   if (cameraStream) {
//     cameraStream.getTracks().forEach((track) => track.stop());
//     cameraStream = null;
//   }

//   if (cameraContainer) {
//     cameraContainer.remove();
//     cameraContainer = null;
//   }

//   if (videoElement) {
//     videoElement.srcObject = null;
//     videoElement = null;
//   }

//   // Update popup button - camera is inactive
//   chrome.runtime.sendMessage({ action: "updateButton", isRecording: false });
// }

// // Cleanup on page unload
// window.addEventListener("beforeunload", () => {
//   stopCamera();
// });

/////////// test ///////////////

let cameraContainer = null;
let videoElement = null;
let cameraStream = null;

// Set up message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startCamera") {
    if (!cameraContainer) {
      startCamera();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "Camera is already active." });
    }
    return true;
  } else if (request.action === "stopCamera") {
    if (cameraContainer) {
      stopCamera();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "Camera is not active." });
    }
    return true;
  } else if (request.action === "download-recording") {
    try {
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = request.url;
      a.download = "screen-recording.webm";
      document.body.appendChild(a);
      a.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(request.url);
      }, 100);

      sendResponse({ success: true });
    } catch (error) {
      console.error("Download error:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
});

async function startCamera() {
  try {
    // Request only video permission for camera
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false, // Don't need audio for camera feed
    });

    // Create camera container
    cameraContainer = document.createElement("div");
    cameraContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 200px;
      height: 200px;
      border-radius: 50%;
      overflow: hidden;
      z-index: 9999;
      border: 3px solid #2196F3;
    `;

    // Create video element
    videoElement = document.createElement("video");
    videoElement.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
    `;
    videoElement.autoplay = true;
    videoElement.muted = true;
    videoElement.srcObject = cameraStream;

    cameraContainer.appendChild(videoElement);
    document.body.appendChild(cameraContainer);

    // Update popup button - camera is active
    chrome.runtime.sendMessage({ action: "updateButton", isRecording: true });
  } catch (error) {
    console.error("Error accessing camera:", error);
    alert("Error accessing camera. Please check permissions.");
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }

  if (cameraContainer) {
    cameraContainer.remove();
    cameraContainer = null;
  }

  if (videoElement) {
    videoElement.srcObject = null;
    videoElement = null;
  }

  // Update popup button - camera is inactive
  chrome.runtime.sendMessage({ action: "updateButton", isRecording: false });
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  stopCamera();
});
