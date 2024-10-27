// let isRecording = false;
// let recordingTabId = null; // Track which tab is being recorded
// let includeCamera = false; // Track whether to include the camera
// let includeAudio = true; // Track whether to include audio

// function updateButtonState(recording) {
//   const button = document.getElementById("recordButton");
//   isRecording = recording;
//   button.textContent = isRecording ? "Stop Recording" : "Record Tab";
//   button.className = isRecording ? "recording" : "";

//   // Disable the 'Include Camera' and 'Include Audio' toggles when recording
//   document.getElementById("cameraToggle").disabled = isRecording;
//   document.getElementById("audioToggle").disabled = isRecording;
// }

// function resetFlags() {
//   includeCamera = false;
//   includeAudio = true; // Reset to default value
// }

// function closePopup() {
//   window.close();
// }

// // On popup load, get the current recording state and settings
// document.addEventListener("DOMContentLoaded", () => {
//   chrome.storage.local.get(
//     ["isRecording", "includeCamera", "includeAudio", "recordingTabId"],
//     (data) => {
//       if (data) {
//         isRecording = data.isRecording || false;
//         includeCamera = data.includeCamera || false;
//         includeAudio =
//           data.includeAudio !== undefined ? data.includeAudio : true;
//         recordingTabId = data.recordingTabId || null;

//         updateButtonState(isRecording);

//         // Set the toggles to reflect the stored settings
//         document.getElementById("cameraToggle").checked = includeCamera;
//         document.getElementById("audioToggle").checked = includeAudio;
//       }
//     }
//   );
// });

// document.getElementById("recordButton").addEventListener("click", async () => {
//   try {
//     if (!isRecording) {
//       // Get the state of the camera and audio toggles
//       includeCamera = document.getElementById("cameraToggle").checked;
//       includeAudio = document.getElementById("audioToggle").checked;

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
//           includeCamera: includeCamera, // Pass the camera preference
//           includeAudio: includeAudio, // Pass the audio preference
//         },
//         (response) => {
//           if (response && response.success) {
//             // Update the button state to recording
//             updateButtonState(true);
//             // Close the popup after starting the recording
//             closePopup();
//           } else {
//             // Handle error starting recording
//             alert(`Failed to start recording: ${response.error}`);
//             updateButtonState(false);
//             resetFlags();
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

//       // Reset flags
//       resetFlags();

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
//     resetFlags();
//     updateButtonState(false);
//   }
// });

////////////////////////////////////////////////////////////
// popup.js

let isRecording = false;
let recordingTabId = null; // Track which tab is being recorded
let includeCamera = false; // Track whether to include the camera
let includeAudio = true; // Track whether to include audio

function updateButtonState(recording) {
  const button = document.getElementById("recordButton");
  isRecording = recording;
  button.textContent = isRecording ? "Stop Recording" : "Record Tab";
  button.className = isRecording ? "recording" : "";

  // Disable the 'Include Camera' and 'Include Audio' toggles when recording
  document.getElementById("cameraToggle").disabled = isRecording;
  document.getElementById("audioToggle").disabled = isRecording;
}

function resetFlags() {
  includeCamera = false;
  includeAudio = true; // Reset to default value
}

function closePopup() {
  window.close();
}

// On popup load, get the current recording state and settings
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(
    ["isRecording", "includeCamera", "includeAudio", "recordingTabId"],
    (data) => {
      if (data) {
        isRecording = data.isRecording || false;
        includeCamera = data.includeCamera || false;
        includeAudio =
          data.includeAudio !== undefined ? data.includeAudio : true;
        recordingTabId = data.recordingTabId || null;

        updateButtonState(isRecording);

        // Set the toggles to reflect the stored settings
        document.getElementById("cameraToggle").checked = includeCamera;
        document.getElementById("audioToggle").checked = includeAudio;
      }
    }
  );
});

document.getElementById("recordButton").addEventListener("click", async () => {
  try {
    if (!isRecording) {
      // Get the state of the camera and audio toggles
      includeCamera = document.getElementById("cameraToggle").checked;
      includeAudio = document.getElementById("audioToggle").checked;

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
          includeCamera: includeCamera, // Pass the camera preference
          includeAudio: includeAudio, // Pass the audio preference
        },
        (response) => {
          if (response && response.success) {
            // Update the button state to recording
            updateButtonState(true);
            // Close the popup after starting the recording
            closePopup();
          } else {
            // Handle error starting recording
            alert(`Failed to start recording: ${response.error}`);
            updateButtonState(false);
            resetFlags();
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

      // Reset flags
      resetFlags();

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
    resetFlags();
    updateButtonState(false);
  }
});
