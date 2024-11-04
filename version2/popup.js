// popup.js

// let isRecording = false;
// let recordingTabId = null;
// let includeAudio = true;

// function updateButtonState(recording) {
//   const button = document.getElementById("recordButton");
//   isRecording = recording;
//   button.textContent = isRecording ? "Stop Recording" : "Record";
//   button.className = isRecording ? "recording" : "";

//   document.getElementById("audioToggle").disabled = isRecording;
// }

// function resetFlags() {
//   includeAudio = true;
// }

// function closePopup() {
//   window.close();
// }

// // Request current recording state when popup loads
// document.addEventListener("DOMContentLoaded", () => {
//   // Get both recording state and tabId from storage
//   chrome.storage.local.get(
//     ["isRecording", "recordingTabId", "includeAudio"],
//     (data) => {
//       isRecording = data.isRecording || false;
//       recordingTabId = data.recordingTabId || null;
//       includeAudio = data.includeAudio !== undefined ? data.includeAudio : true;

//       updateButtonState(isRecording);
//       document.getElementById("audioToggle").checked = includeAudio;
//     }
//   );
// });

// document.getElementById("recordButton").addEventListener("click", async () => {
//   try {
//     const [tab] = await chrome.tabs.query({
//       active: true,
//       currentWindow: true,
//     });

//     // Check if the URL is unsupported
//     const unsupportedSchemes = [
//       "chrome://",
//       "edge://",
//       "about:",
//       "moz-extension://",
//       "chrome-extension://",
//       "edge-extension://",
//     ];
//     const url = tab.url;

//     if (unsupportedSchemes.some((scheme) => url.startsWith(scheme))) {
//       alert(
//         "Recording cannot be started from this page due to security restrictions. Please switch to another tab."
//       );
//       return;
//     }

//     if (!isRecording) {
//       // Starting recording
//       includeAudio = document.getElementById("audioToggle").checked;
//       recordingTabId = tab.id;

//       console.log("Starting recording on tab:", recordingTabId);

//       // Save state to storage
//       await chrome.storage.local.set({
//         includeAudio,
//         recordingTabId,
//         isRecording: true,
//       });

//       // Inject content script
//       await chrome.scripting.executeScript({
//         target: { tabId: recordingTabId },
//         files: ["content.js"],
//       });

//       // Send message to content script to start recording
//       chrome.tabs.sendMessage(
//         recordingTabId,
//         {
//           action: "startRecording",
//           includeAudio: includeAudio,
//           recordingTabId: recordingTabId,
//         },
//         (response) => {
//           if (chrome.runtime.lastError) {
//             console.error("Runtime error:", chrome.runtime.lastError);
//             chrome.storage.local.set({
//               isRecording: false,
//               recordingTabId: null,
//             });
//             updateButtonState(false);
//             resetFlags();
//             return;
//           }
//           if (response && response.success) {
//             // Update recording state
//             isRecording = true;
//             // Notify background script
//             chrome.runtime.sendMessage({
//               action: "startRecording",
//               recordingTabId: recordingTabId,
//             });
//             updateButtonState(true);
//             closePopup();
//           } else {
//             // Recording did not start, reset the state
//             chrome.storage.local.set({
//               isRecording: false,
//               recordingTabId: null,
//             });
//             isRecording = false;
//             recordingTabId = null;
//             updateButtonState(false);
//             resetFlags();
//           }
//         }
//       );
//     } else {
//       // Get current recording tab ID from storage
//       const data = await chrome.storage.local.get(["recordingTabId"]);
//       const storedTabId = data.recordingTabId;

//       if (storedTabId) {
//         try {
//           // Send stop recording message to content script
//           await chrome.tabs.sendMessage(storedTabId, {
//             action: "stopRecording",
//           });

//           // Update states
//           isRecording = false;
//           recordingTabId = null;

//           // Update storage and notify background
//           await chrome.storage.local.set({
//             isRecording: false,
//             recordingTabId: null,
//           });

//           await chrome.runtime.sendMessage({ action: "stopRecording" });

//           updateButtonState(false);
//           resetFlags();
//           closePopup();
//         } catch (error) {
//           console.error("Error sending stop message:", error);
//           // Reset state even if there's an error
//           isRecording = false;
//           recordingTabId = null;
//           await chrome.storage.local.set({
//             isRecording: false,
//             recordingTabId: null,
//           });
//           updateButtonState(false);
//           resetFlags();
//         }
//       } else {
//         console.error("No recordingTabId found to stop recording.");
//         isRecording = false;
//         recordingTabId = null;
//         await chrome.storage.local.set({
//           isRecording: false,
//           recordingTabId: null,
//         });
//         updateButtonState(false);
//         resetFlags();
//       }
//     }
//   } catch (error) {
//     console.error("Error:", error);
//     // Make sure we reset everything on error
//     isRecording = false;
//     recordingTabId = null;
//     await chrome.storage.local.set({
//       isRecording: false,
//       recordingTabId: null,
//     });
//     resetFlags();
//     updateButtonState(false);
//   }
// });

//// TEST 2 /////
//////////////////////////////////////////////////////////////

let isRecording = false;
let recordingTabId = null;
let includeAudio = true;

function updateButtonState(recording) {
  const button = document.getElementById("recordButton");
  isRecording = recording;
  button.textContent = isRecording ? "Stop Recording" : "Record";
  button.className = isRecording ? "recording" : "";

  document.getElementById("audioToggle").disabled = isRecording;
}

function resetFlags() {
  includeAudio = true;
}

function closePopup() {
  window.close();
}

// Request current recording state when popup loads
document.addEventListener("DOMContentLoaded", () => {
  // Get both recording state and tabId from storage
  chrome.storage.local.get(
    ["isRecording", "recordingTabId", "includeAudio"],
    (data) => {
      isRecording = data.isRecording || false;
      recordingTabId = data.recordingTabId || null;
      includeAudio = data.includeAudio !== undefined ? data.includeAudio : true;

      updateButtonState(isRecording);
      document.getElementById("audioToggle").checked = includeAudio;
    }
  );
});

// document.getElementById("recordButton").addEventListener("click", async () => {
//   try {
//     const [tab] = await chrome.tabs.query({
//       active: true,
//       currentWindow: true,
//     });

//     // Check if the URL is unsupported
//     const unsupportedSchemes = [
//       "chrome://",
//       "edge://",
//       "about:",
//       "moz-extension://",
//       "chrome-extension://",
//       "edge-extension://",
//     ];
//     const url = tab.url;

//     if (unsupportedSchemes.some((scheme) => url.startsWith(scheme))) {
//       alert(
//         "Recording cannot be started from this page due to security restrictions. Please switch to another tab."
//       );
//       return;
//     }

//     if (!isRecording) {
//       // Starting recording
//       includeAudio = document.getElementById("audioToggle").checked;
//       recordingTabId = tab.id;

//       console.log("Starting recording on tab:", recordingTabId);

//       // Save state to storage
//       await chrome.storage.local.set({
//         includeAudio,
//         recordingTabId,
//         isRecording: true,
//       });

//       // Inject content script
//       await chrome.scripting.executeScript({
//         target: { tabId: recordingTabId },
//         files: ["content.js"],
//       });

//       // Send message to content script to start recording
//       chrome.tabs.sendMessage(
//         recordingTabId,
//         {
//           action: "startRecording",
//           includeAudio: includeAudio,
//           recordingTabId: recordingTabId,
//         },
//         (response) => {
//           if (chrome.runtime.lastError) {
//             console.error("Runtime error:", chrome.runtime.lastError);
//             chrome.storage.local.set({
//               isRecording: false,
//               recordingTabId: null,
//             });
//             updateButtonState(false);
//             resetFlags();
//             return;
//           }
//           if (response && response.success) {
//             // Update recording state
//             isRecording = true;
//             // Notify background script
//             chrome.runtime.sendMessage({
//               action: "startRecording",
//               recordingTabId: recordingTabId,
//             });
//             updateButtonState(true);
//             closePopup();
//           } else {
//             // Recording did not start, reset the state
//             chrome.storage.local.set({
//               isRecording: false,
//               recordingTabId: null,
//             });
//             isRecording = false;
//             recordingTabId = null;
//             updateButtonState(false);
//             resetFlags();
//           }
//         }
//       );
//     } else {
//       // Get current recording tab ID from storage
//       const data = await chrome.storage.local.get(["recordingTabId"]);
//       const storedTabId = data.recordingTabId;

//       if (storedTabId) {
//         try {
//           // Send stop recording message to content script
//           await chrome.tabs.sendMessage(storedTabId, {
//             action: "stopRecording",
//           });

//           // Update states
//           isRecording = false;
//           recordingTabId = null;

//           // Update storage and notify background
//           await chrome.storage.local.set({
//             isRecording: false,
//             recordingTabId: null,
//           });

//           await chrome.runtime.sendMessage({ action: "stopRecording" });

//           updateButtonState(false);
//           resetFlags();
//           closePopup();
//         } catch (error) {
//           console.error("Error sending stop message:", error);
//           // Reset state even if there's an error
//           isRecording = false;
//           recordingTabId = null;
//           await chrome.storage.local.set({
//             isRecording: false,
//             recordingTabId: null,
//           });
//           updateButtonState(false);
//           resetFlags();
//         }
//       } else {
//         console.error("No recordingTabId found to stop recording.");
//         isRecording = false;
//         recordingTabId = null;
//         await chrome.storage.local.set({
//           isRecording: false,
//           recordingTabId: null,
//         });
//         updateButtonState(false);
//         resetFlags();
//       }
//     }
//   } catch (error) {
//     console.error("Error:", error);
//     // Make sure we reset everything on error
//     isRecording = false;
//     recordingTabId = null;
//     await chrome.storage.local.set({
//       isRecording: false,
//       recordingTabId: null,
//     });
//     resetFlags();
//     updateButtonState(false);
//   }
// });

////////////////////////////

document.getElementById("recordButton").addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    // Check if the URL is unsupported
    const unsupportedSchemes = [
      "chrome://",
      "edge://",
      "about:",
      "moz-extension://",
      "chrome-extension://",
      "edge-extension://",
    ];
    const url = tab.url;

    if (unsupportedSchemes.some((scheme) => url.startsWith(scheme))) {
      alert(
        "Recording cannot be started from this page due to security restrictions. Please switch to another tab."
      );
      return;
    }

    if (!isRecording) {
      // Starting recording
      includeAudio = document.getElementById("audioToggle").checked;
      recordingTabId = tab.id;

      console.log("Starting recording on tab:", recordingTabId);

      // Save state to storage
      await chrome.storage.local.set({
        includeAudio,
        recordingTabId,
        isRecording: true,
      });

      // Inject content script
      await chrome.scripting.executeScript({
        target: { tabId: recordingTabId },
        files: ["content.js"],
      });

      // Send message to content script to start recording
      chrome.tabs.sendMessage(
        recordingTabId,
        {
          action: "startRecording",
          includeAudio: includeAudio,
          recordingTabId: recordingTabId,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Runtime error:", chrome.runtime.lastError);
            chrome.storage.local.set({
              isRecording: false,
              recordingTabId: null,
            });
            updateButtonState(false);
            resetFlags();
            return;
          }
          if (response && response.success) {
            // Update recording state
            isRecording = true;
            // Notify background script
            chrome.runtime.sendMessage({
              action: "startRecording",
              recordingTabId: recordingTabId,
            });
            updateButtonState(true);
            closePopup();
          } else {
            // Recording did not start, reset the state
            chrome.storage.local.set({
              isRecording: false,
              recordingTabId: null,
            });
            isRecording = false;
            recordingTabId = null;
            updateButtonState(false);
            resetFlags();
          }
        }
      );
    } else {
      // Get current recording tab ID from storage
      const data = await chrome.storage.local.get(["recordingTabId"]);
      const storedTabId = data.recordingTabId;

      if (storedTabId) {
        try {
          // Send stop recording message to content script
          await chrome.tabs.sendMessage(storedTabId, {
            action: "stopRecording",
          });

          // Update states
          isRecording = false;
          recordingTabId = null;

          // Update storage and notify background
          await chrome.storage.local.set({
            isRecording: false,
            recordingTabId: null,
          });

          await chrome.runtime.sendMessage({ action: "stopRecording" });

          updateButtonState(false);
          resetFlags();
          closePopup();
        } catch (error) {
          console.error("Error sending stop message:", error);
          // Reset state even if there's an error
          isRecording = false;
          recordingTabId = null;
          await chrome.storage.local.set({
            isRecording: false,
            recordingTabId: null,
          });
          updateButtonState(false);
          resetFlags();
        }
      } else {
        console.error("No recordingTabId found to stop recording.");
        isRecording = false;
        recordingTabId = null;
        await chrome.storage.local.set({
          isRecording: false,
          recordingTabId: null,
        });
        updateButtonState(false);
        resetFlags();
      }
    }
  } catch (error) {
    console.error("Error:", error);
    // Make sure we reset everything on error
    isRecording = false;
    recordingTabId = null;
    await chrome.storage.local.set({
      isRecording: false,
      recordingTabId: null,
    });
    resetFlags();
    updateButtonState(false);
  }
});
