# ChatGPT-Web

This project is developed based on [chatgpt-vercel](https://github.com/ourongxing/chatgpt-vercel).
- Customize some UI elements
- Translation
- Other more...

### Development
1. `pnpm i`
2. `pnpm dev`

### Environment Variables

| Environment Variables                  | Description                                                                                                                                                                                                                                       | Default Value                                                                                             |
| ------------------------- |---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| `OPENAI_API_KEY`          | OpenAI API Key, you can fill in more than one, separated by \| or line break, and call it randomly. It is better to fill in more than one, the API has a concurrency limit. If the user does not fill in his own key, then your key will be used. | NA                                                                                                        |
| `OPENAI_API_BASE_URL`     | The OpenAI proxy server can be filled in for local development, but it is not required for Vercel. And it is not recommended to use it in production.                                                                                             | api.openai.com                                                                                            |
| `NO_GFW`                  | It means that the server can be connected directly without `OPENAI_API_BASE_URL`, and it is not used even if it is set.                                                                                                                           | false                                                                                                     |
| `TIMEOUT`                 | Timeout in millisecond                                                                                                                                                                                                                            | 30000                                                                                                     |
| `PASSWORD`                | Password for sending message                                                                                                                                                                                                                      | Empty                                                                                                     |
| `CLIENT_DEFAULT_MESSAGE`  | Default prompt message                                                                                                                                                                                                                            | - xx xx                                                                                                   |
| `CLIENT_GLOBAL_SETTINGS`  | Default Global Settings                                                                                                                                                                                                                           | {"APIKey":"","password":"","enterToSend":true}                                                            |
| `CLIENT_SESSION_SETTINGS` | Default conversation settings, conversation settings are independent in each conversation.                                                                                                                                                        | {"title":"","saveSession":true,"APITemperature":0.6,"continuousDialogue":true,"APIModel":"gpt-3.5-turbo"} |
| `CLIENT_MAX_INPUT_TOKENS` | The maximum token is different for different models of OpenAI, and the price is also different, so you can set it separately. And OpenAI will count the sum of input + output, but we only limit the input here.                                  | {"gpt-3.5-turbo":4096,"gpt-4":8192,"gpt-4-32k":32768}                                                     |

There are two ways to set up
1. Modify the `.env.example` file to `.env` and set it in `.env`.
2. set `Environment Variables` in Vercel. Try to use this method, it is more convenient. It will take effect on the next deployment.

## Submit your Prompts

1. Fork this project.
2. Modify `prompts.md`.
3. Pull Request and it will work.

## License

[MIT](./LICENSE)
