// let isRecording = false;
// let recordingTabId = null; // Add this to track which tab is being recorded

// function updateButtonState(recording) {
//   const button = document.getElementById("recordButton");
//   isRecording = recording;
//   button.textContent = isRecording ? "Stop Recording" : "Record Tab";
//   button.className = isRecording ? "recording" : "";
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
//       // Get current tab
//       const [tab] = await chrome.tabs.query({
//         active: true,
//         currentWindow: true,
//       });

//       recordingTabId = tab.id;
//       console.log("Starting recording on tab:", recordingTabId);

//       // Start recording
//       chrome.runtime.sendMessage({
//         action: "startRecording",
//         tabId: tab.id,
//       });

//       try {
//         // Try to inject content script
//         await chrome.scripting.executeScript({
//           target: { tabId: tab.id },
//           files: ["content.js"],
//         });
//         await chrome.tabs.sendMessage(tab.id, { action: "toggleRecording" });
//       } catch (error) {
//         console.log(
//           "Could not inject content script, continuing with recording"
//         );
//       }
//     } else {
//       // Stop recording - no need to check current tab
//       chrome.runtime.sendMessage({
//         action: "stopRecording",
//       });

//       // Try to send message to the original recording tab
//       try {
//         if (recordingTabId) {
//           await chrome.tabs.sendMessage(recordingTabId, {
//             action: "toggleRecording",
//           });
//         }
//       } catch (error) {
//         console.log(
//           "Could not send message to original tab, continuing with stop"
//         );
//       }
//     }

//     updateButtonState(!isRecording);
//   } catch (error) {
//     console.error("Error:", error);
//     alert("An error occurred. The recording has been stopped.");

//     // Force stop recording in case of error
//     chrome.runtime.sendMessage({
//       action: "stopRecording",
//     });
//     updateButtonState(false);
//   }
// });

// // Listen for recording cancelled messages
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === "recordingCancelled") {
//     console.log("Recording cancelled:", request.reason);
//     alert(`Recording cancelled: ${request.reason}`);
//     updateButtonState(false);
//   }
// });

///////////////// test

let isRecording = false;
let recordingTabId = null; // Add this to track which tab is being recorded

function updateButtonState(recording) {
  const button = document.getElementById("recordButton");
  isRecording = recording;
  button.textContent = isRecording ? "Stop Recording" : "Record Tab";
  button.className = isRecording ? "recording" : "";
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
                // Inject content script and start camera
                injectCameraScript(tab.id);
                chrome.runtime.onMessage.removeListener(listener);
              } else if (request.action === "recordingCancelled") {
                // Handle recording cancellation
                alert(`Recording cancelled: ${request.reason}`);
                updateButtonState(false);
                chrome.runtime.onMessage.removeListener(listener);
              }
            });
          } else {
            // Handle error starting recording
            alert(`Failed to start recording: ${response.error}`);
            updateButtonState(false);
          }
        }
      );
    } else {
      // Stop recording - no need to check current tab
      chrome.runtime.sendMessage({
        action: "stopRecording",
      });
      // Stop the camera in the recording tab
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

    updateButtonState(!isRecording);
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred. The recording has been stopped.");

    // Force stop recording in case of error
    chrome.runtime.sendMessage({
      action: "stopRecording",
    });
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
