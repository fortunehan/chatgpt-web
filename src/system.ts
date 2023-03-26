export const setting = {
  continuousDialogue: false,
  archiveSession: true,
  openaiAPIKey: "",
  openaiAPITemperature: 60,
  password: localStorage.getItem("password"),
  systemRule: ""
}

export const message = ""

export type Setting = typeof setting

export const resetContinuousDialogue = false
