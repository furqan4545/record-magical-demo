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

      // Start recording
      chrome.runtime.sendMessage({
        action: "startRecording",
        tabId: tab.id,
      });

      try {
        // Try to inject content script
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"],
        });
        await chrome.tabs.sendMessage(tab.id, { action: "toggleRecording" });
      } catch (error) {
        console.log(
          "Could not inject content script, continuing with recording"
        );
      }
    } else {
      // Stop recording - no need to check current tab
      chrome.runtime.sendMessage({
        action: "stopRecording",
      });

      // Try to send message to the original recording tab
      try {
        if (recordingTabId) {
          await chrome.tabs.sendMessage(recordingTabId, {
            action: "toggleRecording",
          });
        }
      } catch (error) {
        console.log(
          "Could not send message to original tab, continuing with stop"
        );
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
