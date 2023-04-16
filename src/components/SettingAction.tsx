import type { Accessor, Setter } from "solid-js"
import { createSignal, type JSXElement, Show } from "solid-js"
import { toBlob, toJpeg } from "html-to-image"
import { copyToClipboard, dateFormat, isMobile } from "~/utils"
import type { ChatMessage, Model } from "~/types"
import type { Setting } from "~/system"
import { clickOutside } from "~/hooks"

export default function SettingAction(props: {
  setting: Accessor<Setting>
  setSetting: Setter<Setting>
  clear: any
  messaages: ChatMessage[]
}) {
  const [shown, setShown] = createSignal(false)
  const [copied, setCopied] = createSignal(false)
  const [imgCopied, setIMGCopied] = createSignal(false)
  // tree shaking
  clickOutside

  // @ts-ignore
  return (
    <div
      class="text-sm text-slate-7 dark:text-slate my-2"
      use:clickOutside={() => setShown(false)}
    >
      <Show when={shown()}>
        <div class="<sm:max-h-10em max-h-14em overflow-y-auto">
          <SettingItem icon="i-ri:lock-password-line" label="password">
            <input
              type="password"
              value={props.setting().password}
              class="max-w-150px ml-1em px-1 text-slate-7 dark:text-slate rounded-sm bg-slate bg-op-15 focus:bg-op-20 focus:ring-0 focus:outline-none"
              onInput={e => {
                props.setSetting({
                  ...props.setting(),
                  password: (e.target as HTMLInputElement).value
                })
              }}
            />
          </SettingItem>
          <SettingItem icon="i-carbon:api" label="key">
            <input
              type="password"
              value={props.setting().openaiAPIKey}
              class="max-w-150px ml-1em px-1 text-slate-7 dark:text-slate rounded-sm bg-slate bg-op-15 focus:bg-op-20 focus:ring-0 focus:outline-none"
              onInput={e => {
                props.setSetting({
                  ...props.setting(),
                  openaiAPIKey: (e.target as HTMLInputElement).value
                })
              }}
            />
          </SettingItem>
          <SettingItem icon="i-carbon:machine-learning-model" label="model">
            <select
              name="model"
              class="max-w-150px w-full bg-slate bg-op-15 rounded-sm appearance-none accent-slate text-center  focus:bg-op-20 focus:ring-0 focus:outline-none"
              value={props.setting().model}
              onChange={e => {
                props.setSetting({
                  ...props.setting(),
                  model: (e.target as HTMLSelectElement).value as Model
                })
              }}
            >
              <option value="gpt-3.5-turbo">gpt-3.5-turbo(4k)</option>
              <option value="gpt-4">gpt-4(8k)</option>
              <option value="gpt-4-32k">gpt-4(32k)</option>
            </select>
          </SettingItem>
          <SettingItem icon="i-carbon:user-online" label="system role">
            <input
              type="text"
              value={props.setting().systemRule}
              class="text-ellipsis max-w-150px ml-1em px-1 text-slate-7 dark:text-slate rounded-sm bg-slate bg-op-15 focus:bg-op-20 focus:ring-0 focus:outline-none"
              onInput={e => {
                props.setSetting({
                  ...props.setting(),
                  systemRule: (e.target as HTMLInputElement).value
                })
              }}
            />
          </SettingItem>
          <SettingItem icon="i-carbon:data-enrichment" label="temperature">
            <input
              type="range"
              min={0}
              max={100}
              value={String(props.setting().openaiAPITemperature)}
              class="max-w-150px w-full h-2 bg-slate bg-op-15 rounded-lg appearance-none cursor-pointer accent-slate"
              onInput={e => {
                props.setSetting({
                  ...props.setting(),
                  openaiAPITemperature: Number(
                    (e.target as HTMLInputElement).value
                  )
                })
              }}
            />
          </SettingItem>
          <SettingItem icon="i-carbon:save-image" label="save conversation">
            <label class="relative inline-flex items-center cursor-pointer ml-1">
              <input
                type="checkbox"
                checked={props.setting().archiveSession}
                class="sr-only peer"
                onChange={e => {
                  props.setSetting({
                    ...props.setting(),
                    archiveSession: (e.target as HTMLInputElement).checked
                  })
                }}
              />
              <div class="w-9 h-5 bg-slate bg-op-15 peer-focus:outline-none peer-focus:ring-0  rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate"></div>
            </label>
          </SettingItem>
          <SettingItem
            icon="i-carbon:3d-curve-auto-colon"
            label="enable context"
          >
            <label class="relative inline-flex items-center cursor-pointer ml-1">
              <input
                type="checkbox"
                checked={props.setting().continuousDialogue}
                class="sr-only peer"
                onChange={e => {
                  props.setSetting({
                    ...props.setting(),
                    continuousDialogue: (e.target as HTMLInputElement).checked
                  })
                }}
              />
              <div class="w-9 h-5 bg-slate bg-op-15 peer-focus:outline-none peer-focus:ring-0  rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate"></div>
            </label>
          </SettingItem>
        </div>
        <hr class="my-1 bg-slate-5 bg-op-15 border-none h-1px"></hr>
      </Show>
      <div class="flex items-center justify-between">
        <ActionItem
          onClick={() => {
            setShown(!shown())
          }}
          icon="i-carbon:settings"
          label="settings"
        />

        <div class="flex">
          <button
            id="assistBtn"
            onClick={() =>
              props.setSetting({
                ...props.setting(),
                continuousDialogue: false,
                systemRule: "你是得力的助手",
                openaiAPITemperature: 60,
                preAction: "",
                prePrompt: ``
              })
            }
            classList={{
              "px-2 py-2 mr-2": true,
              "border-blue-600 border-b": props.setting().preAction === ""
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 256 256"
            >
              <path d="M176,156a12,12,0,1,1-12-12A12,12,0,0,1,176,156ZM92,144a12,12,0,1,0,12,12A12,12,0,0,0,92,144Zm148,24v24a16,16,0,0,1-16,16H32a16,16,0,0,1-16-16V169.13A113.38,113.38,0,0,1,51.4,86.72L26.34,61.66A8,8,0,0,1,37.66,50.34L63.82,76.5a111.43,111.43,0,0,1,128.55-.19l26-26a8,8,0,0,1,11.32,11.32L204.82,86.5c.75.71,1.5,1.43,2.24,2.17A111.25,111.25,0,0,1,240,168Zm-16,0a96,96,0,0,0-96-96h-.34C74.91,72.18,32,115.75,32,169.13V192H224Z"></path>
            </svg>
          </button>
          <button
            id="translateBtn"
            title="translate"
            onClick={() =>
              props.setSetting({
                ...props.setting(),
                continuousDialogue: false,
                systemRule: "",
                openaiAPITemperature: 0,
                preAction: "translate",
                prePrompt: `你是一个翻译引擎，请将翻译给到的文本，只需要翻译不需要解释。当且仅当文本只有一个单词时，请给出单词原始形态（如果有）、单词的语种、对应的音标（如果有）、所有含义（含词性）、双语示例，至少三条例句，请严格按照下面格式给到翻译结果：
                <原始文本>
                [<语种>] · / <单词音标>
                [<词性缩写>] <中文含义>]
                例句：
                <序号><例句>(例句翻译)。
                要翻译的文本是：：`
              })
            }
            classList={{
              "px-2 py-2 mr-2": true,
              "border-blue-600 border-b":
                props.setting().preAction === "translate"
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 256 256"
            >
              <path d="M239.15,212.42l-56-112a8,8,0,0,0-14.31,0l-21.71,43.43A88,88,0,0,1,100,126.93,103.65,103.65,0,0,0,127.69,64H152a8,8,0,0,0,0-16H96V32a8,8,0,0,0-16,0V48H24a8,8,0,0,0,0,16h87.63A87.76,87.76,0,0,1,88,116.35a87.74,87.74,0,0,1-19-31,8,8,0,1,0-15.08,5.34A103.63,103.63,0,0,0,76,127a87.55,87.55,0,0,1-52,17,8,8,0,0,0,0,16,103.46,103.46,0,0,0,64-22.08,104.18,104.18,0,0,0,51.44,21.31l-26.6,53.19a8,8,0,0,0,14.31,7.16L140.94,192h70.11l13.79,27.58A8,8,0,0,0,232,224a8,8,0,0,0,7.15-11.58ZM148.94,176,176,121.89,203.05,176Z"></path>
            </svg>
          </button>
          <button
            id="polishBtn"
            title="polish"
            onClick={() =>
              props.setSetting({
                ...props.setting(),
                continuousDialogue: false,
                systemRule:
                  "Revise the following sentences to make them more clear, concise, and coherent.",
                openaiAPITemperature: 0,
                preAction: "polish",
                prePrompt: `polish this text in English. This is the text：`
              })
            }
            classList={{
              "px-2 py-2 mr-2": true,
              "border-blue-600 border-b": props.setting().preAction === "polish"
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              class="bi bi-spellcheck"
              viewBox="0 0 16 16"
            >
              <path d="M8.217 11.068c1.216 0 1.948-.869 1.948-2.31v-.702c0-1.44-.727-2.305-1.929-2.305-.742 0-1.328.347-1.499.889h-.063V3.983h-1.29V11h1.27v-.791h.064c.21.532.776.86 1.499.86zm-.43-1.025c-.66 0-1.113-.518-1.113-1.28V8.12c0-.825.42-1.343 1.098-1.343.684 0 1.075.518 1.075 1.416v.45c0 .888-.386 1.401-1.06 1.401zm-5.583 1.035c.767 0 1.201-.356 1.406-.737h.059V11h1.216V7.519c0-1.314-.947-1.783-2.11-1.783C1.355 5.736.75 6.42.69 7.27h1.216c.064-.323.313-.552.84-.552.527 0 .864.249.864.771v.464H2.346C1.145 7.953.5 8.568.5 9.496c0 .977.693 1.582 1.704 1.582zm.42-.947c-.44 0-.845-.235-.845-.718 0-.395.269-.684.84-.684h.991v.538c0 .503-.444.864-.986.864zm8.897.567c-.577-.4-.9-1.088-.9-1.983v-.65c0-1.42.894-2.338 2.305-2.338 1.352 0 2.119.82 2.139 1.806h-1.187c-.04-.351-.283-.776-.918-.776-.674 0-1.045.517-1.045 1.328v.625c0 .468.121.834.343 1.067l-.737.92z" />
              <path d="M14.469 9.414a.75.75 0 0 1 .117 1.055l-4 5a.75.75 0 0 1-1.116.061l-2.5-2.5a.75.75 0 1 1 1.06-1.06l1.908 1.907 3.476-4.346a.75.75 0 0 1 1.055-.117z" />
            </svg>
          </button>
          <button
            id="grammarBtn"
            title="grammar analysis"
            onClick={() =>
              props.setSetting({
                ...props.setting(),
                continuousDialogue: false,
                systemRule:
                  "You are a translation engine and grammar analyzer.",
                openaiAPITemperature: 0,
                preAction: "grammar",
                prePrompt: `translate this text to Chinese and explain the grammar in the original text using Chinese. This is the text：`
              })
            }
            classList={{
              "px-2 py-2 mr-2": true,
              "border-blue-600 border-b":
                props.setting().preAction === "grammar"
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              class="bi bi-mortarboard"
              viewBox="0 0 16 16"
            >
              <path d="M8.211 2.047a.5.5 0 0 0-.422 0l-7.5 3.5a.5.5 0 0 0 .025.917l7.5 3a.5.5 0 0 0 .372 0L14 7.14V13a1 1 0 0 0-1 1v2h3v-2a1 1 0 0 0-1-1V6.739l.686-.275a.5.5 0 0 0 .025-.917l-7.5-3.5ZM8 8.46 1.758 5.965 8 3.052l6.242 2.913L8 8.46Z" />
              <path d="M4.176 9.032a.5.5 0 0 0-.656.327l-.5 1.7a.5.5 0 0 0 .294.605l4.5 1.8a.5.5 0 0 0 .372 0l4.5-1.8a.5.5 0 0 0 .294-.605l-.5-1.7a.5.5 0 0 0-.656-.327L8 10.466 4.176 9.032Zm-.068 1.873.22-.748 3.496 1.311a.5.5 0 0 0 .352 0l3.496-1.311.22.748L8 12.46l-3.892-1.556Z" />
            </svg>
          </button>
          <button
            id="codeExplainBtn"
            title="explain codes"
            onClick={() =>
              props.setSetting({
                ...props.setting(),
                continuousDialogue: false,
                systemRule: "",
                openaiAPITemperature: 0,
                preAction: "codeExplain",
                prePrompt: `I would like you to serve as a code interpreter, elucidate the syntax and the semantics of the code. And please give English and Chinese version. The code is: `
              })
            }
            classList={{
              "px-2 py-2 mr-2": true,
              "border-blue-600 border-b":
                props.setting().preAction === "codeExplain"
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              class="bi bi-code-slash"
              viewBox="0 0 16 16"
            >
              <path d="M10.478 1.647a.5.5 0 1 0-.956-.294l-4 13a.5.5 0 0 0 .956.294l4-13zM4.854 4.146a.5.5 0 0 1 0 .708L1.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0zm6.292 0a.5.5 0 0 0 0 .708L14.293 8l-3.147 3.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0z" />
            </svg>
          </button>
          <button
            id="codeExpertBtn"
            title="analysis codes"
            onClick={() =>
              props.setSetting({
                ...props.setting(),
                continuousDialogue: false,
                systemRule: "",
                openaiAPITemperature: 0,
                preAction: "codeExpert",
                prePrompt: `I hope you can conduct code review, debugging, refactoring, algorithm implementation, and provide code explanations. The code is:`
              })
            }
            classList={{
              "px-2 py-2 mr-2": true,
              "border-blue-600 border-b":
                props.setting().preAction === "codeExpert"
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              class="bi bi-braces-asterisk"
              viewBox="0 0 16 16"
            >
              <path
                fill-rule="evenodd"
                d="M1.114 8.063V7.9c1.005-.102 1.497-.615 1.497-1.6V4.503c0-1.094.39-1.538 1.354-1.538h.273V2h-.376C2.25 2 1.49 2.759 1.49 4.352v1.524c0 1.094-.376 1.456-1.49 1.456v1.299c1.114 0 1.49.362 1.49 1.456v1.524c0 1.593.759 2.352 2.372 2.352h.376v-.964h-.273c-.964 0-1.354-.444-1.354-1.538V9.663c0-.984-.492-1.497-1.497-1.6ZM14.886 7.9v.164c-1.005.103-1.497.616-1.497 1.6v1.798c0 1.094-.39 1.538-1.354 1.538h-.273v.964h.376c1.613 0 2.372-.759 2.372-2.352v-1.524c0-1.094.376-1.456 1.49-1.456v-1.3c-1.114 0-1.49-.362-1.49-1.456V4.352C14.51 2.759 13.75 2 12.138 2h-.376v.964h.273c.964 0 1.354.444 1.354 1.538V6.3c0 .984.492 1.497 1.497 1.6ZM7.5 11.5V9.207l-1.621 1.621-.707-.707L6.792 8.5H4.5v-1h2.293L5.172 5.879l.707-.707L7.5 6.792V4.5h1v2.293l1.621-1.621.707.707L9.208 7.5H11.5v1H9.207l1.621 1.621-.707.707L8.5 9.208V11.5h-1Z"
              />
            </svg>
          </button>

          <button
            id="androidMaster"
            title="analysis codes"
            onClick={() =>
              props.setSetting({
                ...props.setting(),
                continuousDialogue: false,
                systemRule: "",
                openaiAPITemperature: 0,
                preAction: "androidMaster",
                prePrompt: `Please explain the concept in Kotlin and Android development, and provide code examples of usage. The first concept is:`
              })
            }
            classList={{
              "px-2 py-2 mr-2": true,
              "border-blue-600 border-b":
                props.setting().preAction === "androidMaster"
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              class="bi bi-android2"
              viewBox="0 0 16 16"
            >
              <path d="m10.213 1.471.691-1.26c.046-.083.03-.147-.048-.192-.085-.038-.15-.019-.195.058l-.7 1.27A4.832 4.832 0 0 0 8.005.941c-.688 0-1.34.135-1.956.404l-.7-1.27C5.303 0 5.239-.018 5.154.02c-.078.046-.094.11-.049.193l.691 1.259a4.25 4.25 0 0 0-1.673 1.476A3.697 3.697 0 0 0 3.5 5.02h9c0-.75-.208-1.44-.623-2.072a4.266 4.266 0 0 0-1.664-1.476ZM6.22 3.303a.367.367 0 0 1-.267.11.35.35 0 0 1-.263-.11.366.366 0 0 1-.107-.264.37.37 0 0 1 .107-.265.351.351 0 0 1 .263-.11c.103 0 .193.037.267.11a.36.36 0 0 1 .112.265.36.36 0 0 1-.112.264Zm4.101 0a.351.351 0 0 1-.262.11.366.366 0 0 1-.268-.11.358.358 0 0 1-.112-.264c0-.103.037-.191.112-.265a.367.367 0 0 1 .268-.11c.104 0 .19.037.262.11a.367.367 0 0 1 .107.265c0 .102-.035.19-.107.264ZM3.5 11.77c0 .294.104.544.311.75.208.204.46.307.76.307h.758l.01 2.182c0 .276.097.51.292.703a.961.961 0 0 0 .7.288.973.973 0 0 0 .71-.288.95.95 0 0 0 .292-.703v-2.182h1.343v2.182c0 .276.097.51.292.703a.972.972 0 0 0 .71.288.973.973 0 0 0 .71-.288.95.95 0 0 0 .292-.703v-2.182h.76c.291 0 .54-.103.749-.308.207-.205.311-.455.311-.75V5.365h-9v6.404Zm10.495-6.587a.983.983 0 0 0-.702.278.91.91 0 0 0-.293.685v4.063c0 .271.098.501.293.69a.97.97 0 0 0 .702.284c.28 0 .517-.095.712-.284a.924.924 0 0 0 .293-.69V6.146a.91.91 0 0 0-.293-.685.995.995 0 0 0-.712-.278Zm-12.702.283a.985.985 0 0 1 .712-.283c.273 0 .507.094.702.283a.913.913 0 0 1 .293.68v4.063a.932.932 0 0 1-.288.69.97.97 0 0 1-.707.284.986.986 0 0 1-.712-.284.924.924 0 0 1-.293-.69V6.146c0-.264.098-.491.293-.68Z" />
            </svg>
          </button>

          <button
            id="iOSMaster"
            title="analysis codes"
            onClick={() =>
              props.setSetting({
                ...props.setting(),
                continuousDialogue: false,
                systemRule: "",
                openaiAPITemperature: 0,
                preAction: "iOSMaster",
                prePrompt: `Please explain the concept in Swift and iOS development, and provide code examples of usage. The first concept is:`
              })
            }
            classList={{
              "px-2 py-2 mr-2": true,
              "border-blue-600 border-b":
                props.setting().preAction === "iOSMaster"
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              class="bi bi-apple"
              viewBox="0 0 16 16"
            >
              <path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516.024.034 1.52.087 2.475-1.258.955-1.345.762-2.391.728-2.43Zm3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422.212-2.189 1.675-2.789 1.698-2.854.023-.065-.597-.79-1.254-1.157a3.692 3.692 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56.244.729.625 1.924 1.273 2.796.576.984 1.34 1.667 1.659 1.899.319.232 1.219.386 1.843.067.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758.347-.79.505-1.217.473-1.282Z" />
              <path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516.024.034 1.52.087 2.475-1.258.955-1.345.762-2.391.728-2.43Zm3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422.212-2.189 1.675-2.789 1.698-2.854.023-.065-.597-.79-1.254-1.157a3.692 3.692 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56.244.729.625 1.924 1.273 2.796.576.984 1.34 1.667 1.659 1.899.319.232 1.219.386 1.843.067.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758.347-.79.505-1.217.473-1.282Z" />
            </svg>
          </button>
        </div>

        <div class="flex">
          <ActionItem
            onClick={async () => {
              await exportJpg()
              setIMGCopied(true)
              setTimeout(() => setIMGCopied(false), 1000)
            }}
            icon={
              imgCopied()
                ? "i-ri:check-fill dark:text-yellow text-yellow-6"
                : "i-carbon:image"
            }
            label="导出图片"
          />
          <ActionItem
            label="导出 Markdown"
            onClick={async () => {
              await exportMD(props.messaages)
              setCopied(true)
              setTimeout(() => setCopied(false), 1000)
            }}
            icon={
              copied()
                ? "i-ri:check-fill dark:text-yellow text-yellow-6"
                : "i-ri:markdown-line"
            }
          />
          <ActionItem
            onClick={props.clear}
            icon="i-carbon:trash-can"
            label="清空对话"
          />
        </div>
      </div>
    </div>
  )
}

function SettingItem(props: {
  children: JSXElement
  icon: string
  label: string
}) {
  return (
    <div class="flex items-center p-1 justify-between hover:bg-slate hover:bg-op-10 rounded">
      <div class="flex items-center">
        <button class={props.icon} />
        <span ml-1>{props.label}</span>
      </div>
      {props.children}
    </div>
  )
}

function ActionItem(props: { onClick: any; icon: string; label?: string }) {
  return (
    <div
      class="flex items-center cursor-pointer mx-1 p-2 hover:bg-slate hover:bg-op-10 rounded text-1.2em"
      onClick={props.onClick}
    >
      <button class={props.icon} title={props.label} />
    </div>
  )
}

async function exportJpg() {
  const messageContainer = document.querySelector(
    "#message-container"
  ) as HTMLElement
  async function downloadIMG() {
    const url = await toJpeg(messageContainer)
    const a = document.createElement("a")
    a.href = url
    a.download = `ChatGPT-${dateFormat(new Date(), "HH-MM-SS")}.jpg`
    a.click()
  }
  if (!isMobile() && navigator.clipboard) {
    try {
      const blob = await toBlob(messageContainer)
      blob &&
        (await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]))
    } catch (e) {
      await downloadIMG()
    }
  } else {
    await downloadIMG()
  }
}

async function exportMD(messages: ChatMessage[]) {
  const role = {
    system: "系统",
    user: "我",
    assistant: "ChatGPT",
    error: "错误"
  }
  await copyToClipboard(
    messages
      .map(k => {
        // @ts-ignore
        return `### ${role[k.role]}\n\n${k.content.trim()}`
      })
      .join("\n\n\n\n")
  )
}
