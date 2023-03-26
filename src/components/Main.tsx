import { createEffect, createSignal, For, onMount, Show } from "solid-js"
import { createResizeObserver } from "@solid-primitives/resize-observer"
import MessageItem from "./MessageItem"
import type { ChatMessage } from "~/types"
import SettingAction from "./SettingAction"
import PromptList from "./PromptList"
import { Fzf } from "fzf"
import throttle from "just-throttle"
import { isMobile } from "~/utils"
import type { Setting } from "~/system"
import { makeEventListener } from "@solid-primitives/event-listener"

export interface PromptItem {
  desc: string
  prompt: string
}

export default function (props: {
  prompts: PromptItem[]
  env: {
    defaultSetting: Setting
    defaultMessage: string
    resetContinuousDialogue: boolean
  }
  sessionKey: string
}) {
  let inputRef: HTMLTextAreaElement
  let containerRef: HTMLDivElement

  const { defaultMessage, defaultSetting, resetContinuousDialogue } = props.env
  const [messageList, setMessageList] = createSignal<ChatMessage[]>([])
  const [inputContent, setInputContent] = createSignal("")
  const [currentAssistantMessage, setCurrentAssistantMessage] = createSignal("")
  const [loading, setLoading] = createSignal(false)
  const [controller, setController] = createSignal<AbortController>()
  const [setting, setSetting] = createSignal(defaultSetting)
  const [compatiblePrompt, setCompatiblePrompt] = createSignal<PromptItem[]>([])
  const [containerWidth, setContainerWidth] = createSignal("init")
  const fzf = new Fzf(props.prompts, {
    selector: k => `${k.desc} (${k.prompt})`
  })
  const [height, setHeight] = createSignal("48px")
  const [compositionend, setCompositionend] = createSignal(true)

  const [isPrepromptEnabled, setPrepromptEnable] = createSignal(false)
  const [preprompt, setPreprompt] = createSignal("")

  const [isCommonEnabled, setCommonEnabled] = createSignal(true)
  const [isTranslatorEnabled, setTranslatorEnabled] = createSignal(false)
  const [isWriteEnabled, setWriteEnabled] = createSignal(false)

  const scrollToBottom = throttle(
    () => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth"
      })
    },
    250,
    { leading: false, trailing: true }
  )

  onMount(() => {
    makeEventListener(
      inputRef,
      "compositionend",
      () => {
        setCompositionend(true)
        handleInput()
      },
      { passive: true }
    )
    makeEventListener(
      inputRef,
      "compositionstart",
      () => {
        setCompositionend(false)
      },
      { passive: true }
    )
    document.querySelector("main")?.classList.remove("before")
    document.querySelector("main")?.classList.add("after")
    createResizeObserver(containerRef, ({ width, height }, el) => {
      if (el === containerRef) setContainerWidth(`${width}px`)
    })
    const setting = localStorage.getItem(`setting`)
    const session = localStorage.getItem(`session`)
    try {
      let archiveSession = false
      if (setting) {
        const parsed = JSON.parse(setting)
        archiveSession = parsed.archiveSession
        setSetting({
          ...defaultSetting,
          ...parsed,
          ...(resetContinuousDialogue ? { continuousDialogue: false } : {})
        })
      }
      if (session && archiveSession) {
        const parsed = JSON.parse(session)
        if (parsed.length > 1) {
          setMessageList(parsed)
        } else if (!defaultMessage) setMessageList([])
        else
          setMessageList([
            {
              role: "assistant",
              content: defaultMessage
            }
          ])
      } else if (!defaultMessage) setMessageList([])
      else
        setMessageList([
          {
            role: "assistant",
            content: defaultMessage
          }
        ])
    } catch {
      console.log("Setting parse error")
    }
  })

  createEffect((prev: number | undefined) => {
    if (prev !== undefined && messageList().length > prev) {
      scrollToBottom()
    }
    return messageList().length
  })

  createEffect(() => {
    if (currentAssistantMessage()) scrollToBottom()
  })

  createEffect(prev => {
    messageList()
    if (prev) {
      if (messageList().length === 0) {
        setMessageList([
          {
            role: "assistant",
            content: defaultMessage
          }
        ])
      } else if (
        messageList().length > 1 &&
        messageList()[0].content === defaultMessage
      ) {
        setMessageList(messageList().slice(1))
      }
      if (setting().archiveSession) {
        localStorage.setItem(`session`, JSON.stringify(messageList()))
      }
    }
    return true
  })

  createEffect(() => {
    localStorage.setItem(`setting`, JSON.stringify(setting()))
  })

  createEffect(prev => {
    inputContent()
    if (prev) {
      setHeight("48px")
      if (inputContent() === "") {
        setCompatiblePrompt([])
      } else {
        const { scrollHeight } = inputRef
        setHeight(
          `${
            scrollHeight > window.innerHeight - 64
              ? window.innerHeight - 64
              : scrollHeight
          }px`
        )
      }
      inputRef.focus()
    }
    return true
  })

  function archiveCurrentMessage() {
    if (currentAssistantMessage()) {
      setMessageList([
        ...messageList(),
        {
          role: "assistant",
          content: currentAssistantMessage().trim()
        }
      ])
      setCurrentAssistantMessage("")
      setLoading(false)
      setController()
      !isMobile() && inputRef.focus()
    }
  }

  async function handleButtonClick(value?: string) {
    const inputValue = value ?? inputContent()
    if (!inputValue) {
      return
    }
    // @ts-ignore
    if (window?.umami) umami.trackEvent("chat_generate")
    setInputContent("")
    if (
      !value ||
      value !==
        messageList()
          .filter(k => k.role === "user")
          .at(-1)?.content
    ) {
      setMessageList([
        ...messageList(),
        {
          role: "user",
          content: inputValue
        }
      ])
    }
    try {
      await fetchGPT(inputValue)
    } catch (error: any) {
      setLoading(false)
      setController()
      setMessageList([
        ...messageList(),
        {
          role: "error",
          content: error.message.includes("aborted a request")
            ? ""
            : error.message.replace(/(sk-\w{5})\w+/g, "$1")
        }
      ])
    }
    archiveCurrentMessage()
  }

  async function fetchGPT(inputValue: string) {
    setLoading(true)
    const controller = new AbortController()
    setController(controller)
    const systemRule = setting().systemRule.trim()
    const message = []
    if (systemRule)
      message.push({
        role: "system",
        content: systemRule
      })
    if (isPrepromptEnabled())
      message.push({
        role: "assistant",
        content: preprompt()
      })
    message.push({
      role: "user",
      content: inputValue
    })
    const response = await fetch("/api", {
      method: "POST",
      body: JSON.stringify({
        messages: setting().continuousDialogue
          ? [...messageList().slice(0, -1), ...message].filter(
              k => k.role !== "error"
            )
          : message,
        key: setting().openaiAPIKey || undefined,
        temperature: setting().openaiAPITemperature / 100,
        password: setting().password
      }),
      signal: controller.signal
    })
    if (!response.ok) {
      const res = await response.json()
      throw new Error(res.error.message)
    }
    const data = response.body
    if (!data) {
      throw new Error("没有返回数据")
    }
    const reader = data.getReader()
    const decoder = new TextDecoder("utf-8")
    let done = false

    while (!done) {
      const { value, done: readerDone } = await reader.read()
      if (value) {
        const char = decoder.decode(value)
        if (char === "\n" && currentAssistantMessage().endsWith("\n")) {
          continue
        }
        if (char) {
          setCurrentAssistantMessage(currentAssistantMessage() + char)
        }
      }
      done = readerDone
    }
  }

  function clearSession() {
    setMessageList([])
    setCurrentAssistantMessage("")
  }

  function stopStreamFetch() {
    if (controller()) {
      controller()?.abort()
      archiveCurrentMessage()
    }
  }

  function reAnswer() {
    handleButtonClick(
      messageList()
        .filter(k => k.role === "user")
        .at(-1)?.content
    )
  }

  function selectPrompt(prompt: string) {
    setInputContent(prompt)
    setCompatiblePrompt([])
    const { scrollHeight } = inputRef
    setHeight(
      `${
        scrollHeight > window.innerHeight - 64
          ? window.innerHeight - 64
          : scrollHeight
      }px`
    )
    inputRef.focus()
  }

  const find = throttle(
    (value: string) => {
      if (value === "/" || value === " ")
        return setCompatiblePrompt(props.prompts.slice(0, 20))
      const query = value.replace(/^[\/ ](.*)/, "$1")
      if (query !== value)
        setCompatiblePrompt(
          fzf
            .find(query)
            .map(k => k.item)
            .slice(0, 20)
        )
    },
    250,
    {
      trailing: false,
      leading: true
    }
  )

  async function handleInput() {
    setHeight("48px")
    const { scrollHeight } = inputRef
    setHeight(
      `${
        scrollHeight > window.innerHeight - 64
          ? window.innerHeight - 64
          : scrollHeight
      }px`
    )
    if (!compositionend()) return
    const { value } = inputRef
    setInputContent(value)
    find(value)
  }

  const handleCommonBtn = () => {
    setPrepromptEnable(false)
    setPreprompt("")

    setSetting({
      ...setting(),
      ...{ continuousDialogue: false, systemRule: "" }
    })

    setCommonEnabled(true)
    setTranslatorEnabled(false)
    setWriteEnabled(false)
  }

  const handleTranslateBtn = () => {
    setPrepromptEnable(true)
    setPreprompt("将以下内容翻译成中文，如果内容本身是中文则翻译成英文。")

    setSetting({
      ...setting(),
      ...{
        continuousDialogue: false,
        systemRule:
          "You are a translation engine that can only translate text and cannot interpret it."
      }
    })

    setCommonEnabled(false)
    setTranslatorEnabled(true)
    setWriteEnabled(false)
  }

  const handleWriteBtn = () => {
    setPrepromptEnable(true)
    setPreprompt(
      "write this text in English, 如果内容本身是中文则使用中文润色这段文本。"
    )

    setSetting({
      ...setting(),
      ...{
        continuousDialogue: false,
        systemRule:
          "Revise the following sentences to make them more clear, concise, and coherent."
      }
    })

    setCommonEnabled(false)
    setTranslatorEnabled(false)
    setWriteEnabled(true)
  }

  return (
    <div ref={containerRef!} class="mt-2">
      <div class="px-1em mb-8em">
        <div
          id="message-container"
          class="px-1em"
          style={{
            "background-color": "var(--c-bg)"
          }}
        >
          <For each={messageList()}>
            {(message, index) => (
              <MessageItem
                role={message.role}
                message={message.content}
                index={index()}
                setInputContent={setInputContent}
                setMessageList={setMessageList}
              />
            )}
          </For>
          {currentAssistantMessage() && (
            <MessageItem role="assistant" message={currentAssistantMessage()} />
          )}
        </div>
      </div>
      <div
        class="pb-2em px-2em fixed bottom-0 z-100 op-0"
        style={
          containerWidth() === "init"
            ? {}
            : {
                transition: "opacity 1s ease-in-out",
                width: containerWidth(),
                opacity: 100,
                "background-color": "var(--c-bg)"
              }
        }
      >
        <Show when={!compatiblePrompt().length && height() === "48px"}>
          <SettingAction
            setting={setting}
            setSetting={setSetting}
            clear={clearSession}
            reAnswer={reAnswer}
            messaages={messageList()}
          />
        </Show>
        <Show
          when={!loading()}
          fallback={() => (
            <div class="h-12 flex items-center justify-center bg-slate bg-op-15 text-slate rounded">
              <span>AI 正在思考...</span>
              <div
                class="ml-1em px-2 py-0.5 border border-slate text-slate rounded-md text-sm op-70 cursor-pointer hover:bg-slate/10"
                onClick={stopStreamFetch}
              >
                不需要了
              </div>
            </div>
          )}
        >
          <Show when={compatiblePrompt().length}>
            <PromptList
              prompts={compatiblePrompt()}
              select={selectPrompt}
            ></PromptList>
          </Show>
          <div class="flex items-end">
            <textarea
              ref={inputRef!}
              id="input"
              placeholder="与 ta 对话吧"
              autocomplete="off"
              value={inputContent()}
              autofocus
              onClick={scrollToBottom}
              onKeyDown={e => {
                if (e.isComposing) return
                if (compatiblePrompt().length) {
                  if (
                    e.key === "ArrowUp" ||
                    e.key === "ArrowDown" ||
                    e.key === "Enter"
                  ) {
                    e.preventDefault()
                  }
                } else if (e.key === "Enter") {
                  if (!e.shiftKey) {
                    e.preventDefault()
                    handleButtonClick()
                  }
                } else if (e.key === "ArrowUp") {
                  const userMessages = messageList()
                    .filter(k => k.role === "user")
                    .map(k => k.content)
                  const content = userMessages.at(-1)
                  if (content && !inputContent()) {
                    e.preventDefault()
                    setInputContent(content)
                  }
                }
              }}
              onInput={handleInput}
              style={{
                height: height(),
                "border-bottom-right-radius": 0,
                "border-top-right-radius": height() === "48px" ? 0 : "0.25rem",
                "border-top-left-radius":
                  compatiblePrompt().length === 0 ? "0.25rem" : 0
              }}
              class="self-end py-3 resize-none w-full px-3 text-slate-7 dark:text-slate bg-slate bg-op-15 focus:bg-op-20 focus:ring-0 focus:outline-none placeholder:text-slate-400 placeholder:text-slate-400 placeholder:op-40"
              rounded-l
            />
            <Show when={inputContent()}>
              <button
                class="i-carbon:add-filled absolute right-5em bottom-3em rotate-45 text-op-20! hover:text-op-80! text-slate-7 dark:text-slate"
                onClick={() => {
                  setInputContent("")
                  inputRef.focus()
                }}
              />
            </Show>
            <div
              class="flex text-slate-7 dark:text-slate bg-slate bg-op-15 text-op-80! hover:text-op-100! h-3em items-center rounded-r"
              style={{
                "border-top-right-radius":
                  compatiblePrompt().length === 0 ? "0.25rem" : 0
              }}
            >
              <button
                title="发送"
                onClick={() => handleButtonClick()}
                class="i-carbon:send-filled text-5 mx-3"
              />
            </div>
          </div>
          <div class="mt-2">
            <button
              id="assist"
              onClick={handleCommonBtn}
              classList={{
                "px-2 py-2 bg-slate bg-op-15 hover:bg-op-20 rounded-full mr-2 border-2 border-blue-100 ":
                  true,
                "border-blue-600": isCommonEnabled()
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
                "px-2 py-2 bg-slate bg-op-15 hover:bg-op-20 rounded-full mr-2 border-2 border-blue-100 ":
                  true,
                "border-blue-600": isTranslatorEnabled()
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
                "px-2 py-2 bg-slate bg-op-15 hover:bg-op-20 rounded-full mr-2 border-2 border-blue-100 ":
                  true,
                "border-blue-600": isWriteEnabled()
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
        </Show>
      </div>
    </div>
  )
}
