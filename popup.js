// let isRecording = false;
// let recordingTabId = null; // Track which tab is being recorded
// let includeCamera = false; // Track whether to include the camera

// function updateButtonState(recording) {
//   const button = document.getElementById("recordButton");
//   isRecording = recording;
//   button.textContent = isRecording ? "Stop Recording" : "Record Tab";
//   button.className = isRecording ? "recording" : "";

//   // Disable the 'Include Camera' toggle when recording
//   document.getElementById("cameraToggle").disabled = isRecording;
// }

// // Check current recording state when popup opens
// chrome.runtime.sendMessage({ action: "getRecordingState" }, (response) => {
//   if (response && response.isRecording !== undefined) {
//     updateButtonState(response.isRecording);
//   }
// });

// document.getElementById("recordButton").addEventListener("click", async () => {
//   try {
//     if (!isRecording) {
//       // Get the state of the camera toggle
//       includeCamera = document.getElementById("cameraToggle").checked;

//       // Get current tab
//       const [tab] = await chrome.tabs.query({
//         active: true,
//         currentWindow: true,
//       });

//       recordingTabId = tab.id;
//       console.log("Starting recording on tab:", recordingTabId);

//       // Start recording and wait for a response
//       chrome.runtime.sendMessage(
//         {
//           action: "startRecording",
//           tabId: tab.id,
//         },
//         (response) => {
//           if (response && response.success) {
//             // Wait for screen sharing permission
//             chrome.runtime.onMessage.addListener(function listener(
//               request,
//               sender,
//               sendResponse
//             ) {
//               if (request.action === "screenShareAllowed") {
//                 if (includeCamera) {
//                   // Inject content script and start camera
//                   injectCameraScript(tab.id);
//                 }
//                 chrome.runtime.onMessage.removeListener(listener);
//               } else if (request.action === "recordingCancelled") {
//                 // Handle recording cancellation
//                 alert(`Recording cancelled: ${request.reason}`);
//                 updateButtonState(false);
//                 chrome.runtime.onMessage.removeListener(listener);
//               }
//             });
//             // Update the button state to recording
//             updateButtonState(true);
//           } else {
//             // Handle error starting recording
//             alert(`Failed to start recording: ${response.error}`);
//             updateButtonState(false);
//           }
//         }
//       );
//     } else {
//       // Stop recording
//       chrome.runtime.sendMessage({
//         action: "stopRecording",
//       });

//       // Stop the camera in the recording tab if it was started
//       if (includeCamera) {
//         try {
//           if (recordingTabId) {
//             await chrome.tabs.sendMessage(recordingTabId, {
//               action: "stopCamera",
//             });
//           }
//         } catch (error) {
//           console.log("Could not stop camera:", error);
//         }
//       }

//       // Reset the includeCamera flag
//       includeCamera = false;

//       // Update the button state to not recording
//       updateButtonState(false);
//     }
//   } catch (error) {
//     console.error("Error:", error);
//     alert("An error occurred. The recording has been stopped.");

//     // Force stop recording in case of error
//     chrome.runtime.sendMessage({
//       action: "stopRecording",
//     });

//     // Stop the camera if it was started
//     if (includeCamera && recordingTabId) {
//       try {
//         await chrome.tabs.sendMessage(recordingTabId, {
//           action: "stopCamera",
//         });
//       } catch (error) {
//         console.log("Could not stop camera:", error);
//       }
//     }

//     // Reset flags and UI
//     includeCamera = false;
//     updateButtonState(false);
//   }
// });

// // Helper function to inject the camera script
// async function injectCameraScript(tabId) {
//   try {
//     await chrome.scripting.executeScript({
//       target: { tabId: tabId },
//       files: ["content.js"],
//     });
//     await chrome.tabs.sendMessage(tabId, { action: "startCamera" });
//   } catch (error) {
//     console.log("Could not inject content script, continuing with recording");
//   }
// }

// // Listen for recording cancelled messages
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === "recordingCancelled") {
//     console.log("Recording cancelled:", request.reason);
//     alert(`Recording cancelled: ${request.reason}`);
//     updateButtonState(false);
//   }
// });

// testing

let isRecording = false;
let recordingTabId = null; // Track which tab is being recorded
let includeCamera = false; // Track whether to include the camera

function updateButtonState(recording) {
  const button = document.getElementById("recordButton");
  isRecording = recording;
  button.textContent = isRecording ? "Stop Recording" : "Record Tab";
  button.className = isRecording ? "recording" : "";

  // Disable the 'Include Camera' toggle when recording
  document.getElementById("cameraToggle").disabled = isRecording;
}

// Check current recording state when popup opens
chrome.runtime.sendMessage({ action: "getRecordingState" }, (response) => {
  if (response && response.isRecording !== undefined) {
    updateButtonState(response.isRecording);
  }
});

document.getElementById("recordButton").addEventListener("click", async () => {
  try {
    if (!isRecording) {
      // Get the state of the camera toggle
      includeCamera = document.getElementById("cameraToggle").checked;

      // Get current tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      recordingTabId = tab.id;
      console.log("Starting recording on tab:", recordingTabId);

      // Start recording and wait for a response
      chrome.runtime.sendMessage(
        {
          action: "startRecording",
          tabId: tab.id,
        },
        (response) => {
          if (response && response.success) {
            // Wait for screen sharing permission
            chrome.runtime.onMessage.addListener(function listener(
              request,
              sender,
              sendResponse
            ) {
              if (request.action === "screenShareAllowed") {
                if (includeCamera) {
                  // Inject content script and start camera
                  injectCameraScript(tab.id);
                }
                chrome.runtime.onMessage.removeListener(listener);
              } else if (request.action === "recordingCancelled") {
                // Handle recording cancellation
                alert(`Recording cancelled: ${request.reason}`);
                updateButtonState(false);
                chrome.runtime.onMessage.removeListener(listener);
              }
            });
            // Update the button state to recording
            updateButtonState(true);
          } else {
            // Handle error starting recording
            alert(`Failed to start recording: ${response.error}`);
            updateButtonState(false);
          }
        }
      );
    } else {
      // Stop recording
      chrome.runtime.sendMessage({
        action: "stopRecording",
      });

      // Stop the camera in the recording tab if it was started
      if (includeCamera) {
        try {
          if (recordingTabId) {
            await chrome.tabs.sendMessage(recordingTabId, {
              action: "stopCamera",
            });
          }
        } catch (error) {
          console.log("Could not stop camera:", error);
        }
      }

      // Reset the includeCamera flag
      includeCamera = false;

      // Update the button state to not recording
      updateButtonState(false);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred. The recording has been stopped.");

    // Force stop recording in case of error
    chrome.runtime.sendMessage({
      action: "stopRecording",
    });

    // Stop the camera if it was started
    if (includeCamera && recordingTabId) {
      try {
        await chrome.tabs.sendMessage(recordingTabId, {
          action: "stopCamera",
        });
      } catch (error) {
        console.log("Could not stop camera:", error);
      }
    }

    // Reset flags and UI
    includeCamera = false;
    updateButtonState(false);
  }
});

// Helper function to inject the camera script
async function injectCameraScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"],
    });
    await chrome.tabs.sendMessage(tabId, { action: "startCamera" });
  } catch (error) {
    console.log("Could not inject content script, continuing with recording");
  }
}

// Listen for recording cancelled messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "recordingCancelled") {
    console.log("Recording cancelled:", request.reason);
    alert(`Recording cancelled: ${request.reason}`);
    updateButtonState(false);
  }
});
