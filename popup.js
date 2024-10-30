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
//   chrome.runtime.sendMessage({ action: "getRecordingState" }, (response) => {
//     if (response) {
//       isRecording = response.isRecording;
//       recordingTabId = response.recordingTabId; // Retrieve the recording tab ID
//       updateButtonState(isRecording);
//     } else {
//       isRecording = false;
//       recordingTabId = null;
//       updateButtonState(isRecording);
//     }

//     // Get includeAudio from storage if needed
//     chrome.storage.local.get(["includeAudio"], (data) => {
//       includeAudio = data.includeAudio !== undefined ? data.includeAudio : true;
//       document.getElementById("audioToggle").checked = includeAudio;
//     });
//   });
// });

// document.getElementById("recordButton").addEventListener("click", async () => {
//   try {
//     /////
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
//     /////

//     if (!isRecording) {
//       includeAudio = document.getElementById("audioToggle").checked;

//       const [tab] = await chrome.tabs.query({
//         active: true,
//         currentWindow: true,
//       });

//       recordingTabId = tab.id;
//       console.log("Starting recording on tab:", recordingTabId);

//       // Save includeAudio to storage
//       chrome.storage.local.set({ includeAudio });

//       // Inject content script into the active tab
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
//             isRecording = false;
//             recordingTabId = null;
//             updateButtonState(false);
//             resetFlags();
//           }
//         }
//       );
//     } else {
//       // Retrieve recordingTabId from background script in case it was lost
//       if (!recordingTabId) {
//         const response = await new Promise((resolve) => {
//           chrome.runtime.sendMessage({ action: "getRecordingState" }, resolve);
//         });
//         recordingTabId = response.recordingTabId;
//       }

//       if (recordingTabId) {
//         // Send message to content script to stop recording
//         chrome.tabs.sendMessage(recordingTabId, { action: "stopRecording" });

//         // Update recording state
//         isRecording = false;
//         recordingTabId = null;
//         // Notify background script
//         chrome.runtime.sendMessage({ action: "stopRecording" });
//         updateButtonState(false);
//         resetFlags();
//         closePopup();
//       } else {
//         console.error("No recordingTabId found to stop recording.");
//         updateButtonState(false);
//         resetFlags();
//       }
//     }
//   } catch (error) {
//     console.error("Error:", error);
//     resetFlags();
//     updateButtonState(false);
//   }
// });

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
  chrome.runtime.sendMessage({ action: "getRecordingState" }, (response) => {
    if (response) {
      isRecording = response.isRecording;
      recordingTabId = response.recordingTabId; // Retrieve the recording tab ID
      updateButtonState(isRecording);
    } else {
      isRecording = false;
      recordingTabId = null;
      updateButtonState(isRecording);
    }

    // Get includeAudio from storage if needed
    chrome.storage.local.get(["includeAudio"], (data) => {
      includeAudio = data.includeAudio !== undefined ? data.includeAudio : true;
      document.getElementById("audioToggle").checked = includeAudio;
    });
  });
});

document.getElementById("recordButton").addEventListener("click", async () => {
  try {
    /////
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
    /////

    if (!isRecording) {
      includeAudio = document.getElementById("audioToggle").checked;

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      recordingTabId = tab.id;
      console.log("Starting recording on tab:", recordingTabId);

      // Save includeAudio to storage
      chrome.storage.local.set({ includeAudio });

      // Inject content script into the active tab
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
            isRecording = false;
            recordingTabId = null;
            updateButtonState(false);
            resetFlags();
          }
        }
      );
    } else {
      // Retrieve recordingTabId from background script in case it was lost
      if (!recordingTabId) {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: "getRecordingState" }, resolve);
        });
        recordingTabId = response.recordingTabId;
      }

      if (recordingTabId) {
        // Send message to content script to stop recording
        chrome.tabs.sendMessage(recordingTabId, { action: "stopRecording" });

        // Update recording state
        isRecording = false;
        recordingTabId = null;
        // Notify background script
        chrome.runtime.sendMessage({ action: "stopRecording" });
        updateButtonState(false);
        resetFlags();
        closePopup();
      } else {
        console.error("No recordingTabId found to stop recording.");
        updateButtonState(false);
        resetFlags();
      }
    }
  } catch (error) {
    console.error("Error:", error);
    resetFlags();
    updateButtonState(false);
  }
});
