import { makeEventListener } from "@solid-primitives/event-listener"
import { Fzf } from "fzf"
import throttle from "just-throttle"
import {
  type Accessor,
  type Setter,
  Show,
  createEffect,
  createSignal,
  onMount,
  batch
} from "solid-js"
import { FZFData, RootStore, loadSession } from "~/store"
import type { Option } from "~/types"
import { parsePrompts, scrollToBottom } from "~/utils"
import SettingAction, { actionState, type FakeRoleUnion } from "./SettingAction"
import SlashSelector from "./SlashSelector"
import { useNavigate } from "solid-start"

// 3em
export const defaultInputBoxHeight = 48
export default function ({
  width,
  height,
  setHeight,
  sendMessage,
  stopStreamFetch
}: {
  width: Accessor<string>
  height: Accessor<number>
  setHeight: Setter<number>
  sendMessage(content?: string, fakeRole?: FakeRoleUnion): void
  stopStreamFetch(): void
}) {
  const [candidateOptions, setCandidateOptions] = createSignal<Option[]>([])
  const [compositionend, setCompositionend] = createSignal(true)
  const navgiate = useNavigate()
  const { store, setStore } = RootStore
  onMount(() => {
    setTimeout(() => {
      FZFData.promptOptions = parsePrompts().map(
        k => ({ title: k.desc, desc: k.detail } as Option)
      )
      FZFData.fzfPrompts = new Fzf(FZFData.promptOptions, {
        selector: k => `${k.title}\n${k.desc}`
      })
    }, 500)
    if (store.inputRef) {
      makeEventListener(
        store.inputRef,
        "compositionend",
        () => {
          setCompositionend(true)
          handleInput()
        },
        { passive: true }
      )
      makeEventListener(
        store.inputRef,
        "compositionstart",
        () => {
          setCompositionend(false)
        },
        { passive: true }
      )
    }
  })

  function setSuitableheight() {
    const scrollHeight = store.inputRef?.scrollHeight
    if (scrollHeight)
      setHeight(
        scrollHeight > window.innerHeight - 80
          ? window.innerHeight - 80
          : scrollHeight
      )
  }

  createEffect(prev => {
    store.inputContent
    if (prev) {
      batch(() => {
        setHeight(defaultInputBoxHeight)
        if (store.inputContent === "") {
          setCandidateOptions([])
        } else {
          setSuitableheight()
        }
      })
    }
    return true
  })

  function selectOption(option?: Option) {
    batch(() => {
      if (option) {
        if (option.extra?.id) {
          navgiate(`/session/${option.extra.id}`)
          loadSession(option.extra.id)
          setStore("inputContent", "")
        } else setStore("inputContent", option.desc)
      }
      setCandidateOptions([])
      setSuitableheight()
    })
    store.inputRef?.focus()
  }

  const searchOptions = throttle(
    (value: string) => {
      if (/^\s{2,}$|^\/{2,}$/.test(value))
        return setCandidateOptions(FZFData.sessionOptions)
      if (value === "/" || value === " ")
        return setCandidateOptions(FZFData.promptOptions)

      const sessionQuery = value.replace(
        /^\s{2,}(.*)\s*$|^\/{2,}(.*)\s*$/,
        "$1$2"
      )
      const promptQuery = value.replace(/^\s(.*)\s*$|^\/(.*)\s*$/, "$1$2")
      if (sessionQuery !== value) {
        setCandidateOptions(
          FZFData.fzfSessions!.find(sessionQuery).map(k => ({
            ...k.item,
            positions: k.positions
          }))
        )
      } else if (promptQuery !== value) {
        setCandidateOptions(
          FZFData.fzfPrompts!.find(promptQuery).map(k => ({
            ...k.item,
            positions: k.positions
          }))
        )
      }
    },
    100,
    {
      trailing: false,
      leading: true
    }
  )

  async function handleInput() {
    // 重新设置高度，让输入框可以自适应高度，-1 是为了标记不是初始状态
    setHeight(defaultInputBoxHeight - 1)
    batch(() => {
      setSuitableheight()
      if (!compositionend()) return
      const value = store.inputRef?.value
      if (value) {
        setStore("inputContent", value)
        searchOptions(value)
      } else {
        setStore("inputContent", "")
        setCandidateOptions([])
      }
    })
  }

  return (
    <div
      class="pb-2em px-2em fixed bottom-0 z-100"
      style={{
        "background-color": "var(--c-bg)",
        width: width() === "init" ? "100%" : width()
      }}
    >
      <div
        style={{
          transition: "opacity 1s ease-in-out",
          opacity: width() === "init" ? 0 : 100
        }}
      >
        <Show when={!store.loading && !candidateOptions().length}>
          <SettingAction />
        </Show>
        <Show
          when={!store.loading}
          fallback={
            <div
              class="cursor-pointer dark:bg-#292B31/90 bg-#E7EBF0/80 h-3em flex items-center justify-center"
              onClick={stopStreamFetch}
            >
              <div role="status">
                <svg
                  aria-hidden="true"
                  class="w-8 h-8 mr-2 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                  viewBox="0 0 100 101"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                    fill="currentColor"
                  />
                  <path
                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                    fill="currentFill"
                  />
                </svg>
                <span class="sr-only">Loading...</span>
              </div>
            </div>
          }
        >
          <SlashSelector
            options={candidateOptions()}
            select={selectOption}
          ></SlashSelector>
          <div class="flex items-end relative">
            <textarea
              ref={el => setStore("inputRef", el)}
              id="input"
              placeholder=""
              autocomplete="off"
              value={store.inputContent}
              autofocus
              onClick={scrollToBottom}
              onKeyDown={e => {
                if (e.isComposing) return
                if (candidateOptions().length) {
                  if (
                    e.key === "ArrowUp" ||
                    e.key === "ArrowDown" ||
                    e.keyCode === 13
                  ) {
                    e.preventDefault()
                  }
                } else if (e.keyCode === 13) {
                  if (!e.shiftKey && store.globalSettings.enterToSend) {
                    e.preventDefault()
                    sendMessage(undefined, actionState.fakeRole)
                  }
                } else if (e.key === "ArrowUp") {
                  const userMessages = store.messageList
                    .filter(k => k.role === "user")
                    .map(k => k.content)
                  const content = userMessages.at(-1)
                  if (content && !store.inputContent) {
                    e.preventDefault()
                    setStore("inputContent", content)
                  }
                }
              }}
              onInput={handleInput}
              style={{
                height: height() + "px"
              }}
              class="self-end p-3 pr-2.2em resize-none w-full text-slate-7 dark:text-slate bg-slate bg-op-15 focus:(bg-op-20 ring-0 outline-none) placeholder:(text-slate-800 dark:text-slate-400 op-40)"
              classList={{
                "rounded-t": candidateOptions().length === 0,
                "rounded-b": true
              }}
            />
            <Show when={store.inputContent}>
              <div
                class="absolute flex text-1em items-center"
                classList={{
                  "right-2.5em bottom-1em": height() === defaultInputBoxHeight,
                  "right-0.8em top-0.8em": height() !== defaultInputBoxHeight
                }}
              >
                <button
                  class="i-carbon:add-filled rotate-45 text-slate-7 dark:text-slate text-op-20! hover:text-op-60!"
                  onClick={() => {
                    setStore("inputContent", "")
                    store.inputRef?.focus()
                  }}
                />
              </div>
            </Show>
            <div class="absolute right-0.5em bottom-0.8em flex items-center">
              <button
                title="发送"
                onClick={() => sendMessage(undefined, actionState.fakeRole)}
                class="i-carbon:send-filled text-1.5em text-slate-7 dark:text-slate text-op-80! hover:text-op-100!"
              />
            </div>
          </div>
        </Show>
      </div>
    </div>
  )
}
