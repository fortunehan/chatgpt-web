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

  const [selectedBtn, setSelectedBtn] = createSignal("commonBtn")

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
    switch (selectedBtn()) {
      case "translateBtn":
        if (/^[a-zA-Z]+$/.test(inputValue.trim())) {
          // 翻译为中文时，增加单词模式，可以更详细的翻译结果，包括：音标、词性、含义、双语示例。
          inputValue = `你是一个翻译引擎，请将翻译给到的文本，只需要翻译不需要解释。当且仅当文本只有一个单词时，请给出单词原始形态（如果有）、单词的语种、对应的音标（如果有）、所有含义（含词性）、双语示例，至少三条例句，请严格按照下面格式给到翻译结果：
                <原始文本>
                [<语种>] · / <单词音标>
                [<词性缩写>] <中文含义>]
                例句：
                <序号><例句>(例句翻译)。
                要翻译的文本是：${inputValue}`
        }
        inputValue = `下面我让你来充当翻译家，你的目标是把任何语言翻译成中文，请翻译时不要带翻译腔，而是要翻译得自然、流畅和地道，最重要的是要简明扼要。请翻译下面这句话：${inputValue}`
        setSetting({
          ...setting(),
          ...{ continuousDialogue: false, systemRule: "" }
        })
      case "writeBtn":
        inputValue = `我希望你能担任英语翻译、拼写校对和修辞改进的角色。我会用任何语言和你交流，你会识别语言，将其翻译并用更为优美和精炼的英语回答我。请将我简单的词汇和句子替换成更为优美和简洁的表达方式，确保意思不变，但使其更具商务性。请仅回答更正和改进的部分，不要写解释。我的第一句话是：${inputValue}`
      case "codeExplainBtn":
        inputValue = `I would like you to serve as a code interpreter, elucidate the syntax and the semantics of the code. And please give English and Chinese version. The code is: ${inputValue}`
      case "codeExpertBtn":
        inputValue = `I hope you can conduct code review, debugging, refactoring, algorithm implementation, and provide code explanations. The code is: ${inputValue}`
      default:
        setSetting({
          ...setting(),
          ...{ continuousDialogue: false, systemRule: "" }
        })
    }

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
            selectedBtn={selectedBtn}
            setSelectedBtn={setSelectedBtn}
          />
        </Show>
        <Show
          when={!loading()}
          fallback={() => (
            <div class="h-12 flex items-center justify-center bg-slate bg-op-15 text-slate rounded">
              <span>Thinking...</span>
              <div
                class="ml-1em px-2 py-0.5 border border-slate text-slate rounded-md text-sm op-70 cursor-pointer hover:bg-slate/10"
                onClick={stopStreamFetch}
              >
                Cancel
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
              placeholder=""
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
                title="Send"
                onClick={() => handleButtonClick()}
                class="i-carbon:send-filled text-5 mx-3"
              />
            </div>
          </div>
        </Show>
      </div>
    </div>
  )
}
