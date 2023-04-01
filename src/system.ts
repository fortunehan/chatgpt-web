import type { Model } from "./types"

export const defaultSetting = {
  continuousDialogue: false,
  archiveSession: true,
  openaiAPIKey: "",
  openaiAPITemperature: 60,
  password: "",
  systemRule: "",
  model: "gpt-3.5-turbo" as Model,
  preAction: "",
  prePrompt: ""
}

export const defaultMessage = ""

export type Setting = typeof defaultSetting

export const defaultResetContinuousDialogue = false

export const defaultMaxInputTokens: Record<Model, number> = {
  "gpt-3.5-turbo": 3072,
  "gpt-4": 6144,
  "gpt-4-32k": 24576
}

export const defaultModel: Model = "gpt-3.5-turbo"
