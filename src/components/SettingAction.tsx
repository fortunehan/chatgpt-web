import type { Accessor, Setter } from "solid-js"
import { createSignal, type JSXElement, Show } from "solid-js"
import { toBlob, toJpeg } from "html-to-image"
import { copyToClipboard, dateFormat, isMobile } from "~/utils"
import type { ChatMessage } from "~/types"
import type { Setting } from "~/system"

export default function SettingAction(props: {
  setting: Accessor<Setting>
  setSetting: Setter<Setting>
  clear: any
  reAnswer: any
  messaages: ChatMessage[]
  setPrepromptEnable: Setter<boolean>
  setPreprompt: Setter<string>
  setCommonEnabled: Setter<boolean>
  setTranslatorEnabled: Setter<boolean>
  setWriteEnabled: Setter<boolean>
  isCommonEnabled: Accessor<boolean>
  isTranslatorEnabled: Accessor<boolean>
  isWriteEnabled: Accessor<boolean>
}) {
  const [shown, setShown] = createSignal(false)
  const [copied, setCopied] = createSignal(false)
  const [imgCopied, setIMGCopied] = createSignal(false)

  const handleCommonBtn = () => {
    props.setPrepromptEnable(false)
    props.setPreprompt("")

    props.setSetting({
      ...props.setting(),
      ...{ continuousDialogue: false, systemRule: "" }
    })

    props.setCommonEnabled(true)
    props.setTranslatorEnabled(false)
    props.setWriteEnabled(false)
  }

  const handleTranslateBtn = () => {
    props.setPrepromptEnable(true)
    props.setPreprompt("将以下内容翻译成中文，如果内容本身是中文则翻译成英文。")

    props.setSetting({
      ...props.setting(),
      ...{
        continuousDialogue: false,
        systemRule:
          "You are a translation engine that can only translate text and cannot interpret it."
      }
    })

    props.setCommonEnabled(false)
    props.setTranslatorEnabled(true)
    props.setWriteEnabled(false)
  }

  const handleWriteBtn = () => {
    props.setPrepromptEnable(true)
    props.setPreprompt(
      "write this text in English, 如果内容本身是中文则使用中文润色这段文本。"
    )

    props.setSetting({
      ...props.setting(),
      ...{
        continuousDialogue: false,
        systemRule:
          "Revise the following sentences to make them more clear, concise, and coherent."
      }
    })

    props.setCommonEnabled(false)
    props.setTranslatorEnabled(false)
    props.setWriteEnabled(true)
  }

  return (
    <div class="text-sm text-slate-7 dark:text-slate mb-2">
      <Show when={shown()}>
        <SettingItem icon="i-ri:lock-password-line" label="网站密码">
          <input
            type="password"
            value={props.setting().password!}
            class="max-w-150px ml-1em px-1 text-slate-7 dark:text-slate rounded-sm bg-slate bg-op-15 focus:bg-op-20 focus:ring-0 focus:outline-none"
            onInput={e => {
              props.setSetting({
                ...props.setting(),
                password: (e.target as HTMLInputElement).value
              })
            }}
          />
        </SettingItem>
        <SettingItem icon="i-carbon:api" label="OpenAI API Key">
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
        <SettingItem icon="i-carbon:user-online" label="系统角色指令">
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
        <SettingItem icon="i-carbon:data-enrichment" label="思维发散程度">
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
        <SettingItem
          icon="i-carbon:save-image"
          label="记录对话内容，刷新不会消失"
        >
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
          label="开启连续对话，将加倍消耗 Token"
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
        <hr class="mt-2 bg-slate-5 bg-op-15 border-none h-1px"></hr>
      </Show>
      <div class="mt-2 flex items-center justify-between">
        <ActionItem
          onClick={() => {
            setShown(!shown())
          }}
          icon="i-carbon:settings"
          label="设置"
        />

        <div class="flex">
          <button
            id="assist"
            onClick={handleCommonBtn}
            classList={{
              "px-2 py-2 mr-2": true,
              "border-blue-600 border-b": props.isCommonEnabled()
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="#f9f6f6"
              viewBox="0 0 256 256"
            >
              <path d="M176,156a12,12,0,1,1-12-12A12,12,0,0,1,176,156ZM92,144a12,12,0,1,0,12,12A12,12,0,0,0,92,144Zm148,24v24a16,16,0,0,1-16,16H32a16,16,0,0,1-16-16V169.13A113.38,113.38,0,0,1,51.4,86.72L26.34,61.66A8,8,0,0,1,37.66,50.34L63.82,76.5a111.43,111.43,0,0,1,128.55-.19l26-26a8,8,0,0,1,11.32,11.32L204.82,86.5c.75.71,1.5,1.43,2.24,2.17A111.25,111.25,0,0,1,240,168Zm-16,0a96,96,0,0,0-96-96h-.34C74.91,72.18,32,115.75,32,169.13V192H224Z"></path>
            </svg>
          </button>
          <button
            id="translate"
            onClick={handleTranslateBtn}
            classList={{
              "px-2 py-2 mr-2": true,
              "border-blue-600 border-b": props.isTranslatorEnabled()
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="#f9f6f6"
              viewBox="0 0 256 256"
            >
              <path d="M239.15,212.42l-56-112a8,8,0,0,0-14.31,0l-21.71,43.43A88,88,0,0,1,100,126.93,103.65,103.65,0,0,0,127.69,64H152a8,8,0,0,0,0-16H96V32a8,8,0,0,0-16,0V48H24a8,8,0,0,0,0,16h87.63A87.76,87.76,0,0,1,88,116.35a87.74,87.74,0,0,1-19-31,8,8,0,1,0-15.08,5.34A103.63,103.63,0,0,0,76,127a87.55,87.55,0,0,1-52,17,8,8,0,0,0,0,16,103.46,103.46,0,0,0,64-22.08,104.18,104.18,0,0,0,51.44,21.31l-26.6,53.19a8,8,0,0,0,14.31,7.16L140.94,192h70.11l13.79,27.58A8,8,0,0,0,232,224a8,8,0,0,0,7.15-11.58ZM148.94,176,176,121.89,203.05,176Z"></path>
            </svg>
          </button>
          <button
            id="write"
            onClick={handleWriteBtn}
            classList={{
              "px-2 py-2 mr-2": true,
              "border-blue-600 border-b": props.isWriteEnabled()
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="#f9f6f6"
              viewBox="0 0 256 256"
            >
              <path d="M240,100.68a15.86,15.86,0,0,0-4.69-11.31L166.63,20.68a16,16,0,0,0-22.63,0L115.57,49.11l-58,21.77A16.06,16.06,0,0,0,47.35,83.23L24.11,222.68A8,8,0,0,0,32,232a8.4,8.4,0,0,0,1.32-.11l139.44-23.24a16,16,0,0,0,12.35-10.17l21.77-58L235.31,112A15.87,15.87,0,0,0,240,100.68Zm-69.87,92.19L55.32,212l47.37-47.37a28,28,0,1,0-11.32-11.32L44,200.7,63.13,85.86,118,65.29,190.7,138ZM104,140a12,12,0,1,1,12,12A12,12,0,0,1,104,140Zm96-15.32L131.31,56l24-24L224,100.68Z"></path>
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
            onClick={props.reAnswer}
            icon="i-carbon:reset"
            label="重新回答"
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
    assistant: "ChatGPT"
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
