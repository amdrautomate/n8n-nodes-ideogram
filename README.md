# n8n-nodes-ideogram

An [n8n](https://n8n.io) community node for [Ideogram](https://ideogram.ai), the image model known for rendering legible text. Generate posters, thumbnails, ads and product shots from a prompt, edit and remix existing images, upscale, replace or remove backgrounds, describe images, generate video, and run Ideogram's ad and commerce tools — from your workflows and as tools for AI agents.

Package: `@amdrautomate/n8n-nodes-ideogram` · Author: [AMDR Automate](https://amdrautomate.ai) · License: MIT

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

Self-hosted: **Settings → Community nodes → Install** and enter `@amdrautomate/n8n-nodes-ideogram`.

To let AI agents use the node as a tool on self-hosted n8n, set `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true`.

## Credentials

The node authenticates with an Ideogram **API key** (sent as the `Api-Key` header).

1. Sign in at [ideogram.ai](https://ideogram.ai) (a free account is enough) and open the [API dashboard](https://ideogram.ai/platform).
2. Under **Billing**, add a payment method and credits. API usage is prepaid; keys work as soon as they are created but requests fail with `402` until the balance is funded.
3. Under **API Keys**, click **Create key** and copy it — it is shown only once.
4. Paste it into the **Ideogram API** credential in n8n and click **Test**.

Prices per image and per second of video are on the [API pricing page](https://ideogram.ai/api-pricing). Every generating operation has a **Dry Run** option that validates and prices the request without generating or billing.

## Ideogram node

| Resource | Operations |
| --- | --- |
| **Image** | Generate, Precise Edit, Remix, Inpaint, Reframe, Upscale, Replace Background, Remove Background, Remove Object, Describe |
| **Video** | Text to Video, Image to Video |
| **Tool** | Ad Resizer, Ad Variations, Ad Localizer, Colorways, Material Swap, Sketch to Render, Ghost Mannequin, Model Pose Variants |
| **Generation** | Get (status and results of an async generation) |
| **Account** | Get Usage, Get Many API Keys |

### Models

**Generate** picks the model from a dropdown: Ideogram 4.5, 4.0, 4.0 Transparent, 3.0, 3.0 Transparent, 2a, Auto, GPT Image 2 / 2.5 Flare / 2.5 Sunburst, Nano Banana 2 / 2.1 / Pro, P-Image and Z-Image. The options shown change with the model (rendering speed, quality, resolution, style presets, palettes, ...). **Remix**, **Reframe**, **Upscale**, **Replace Background** and **Describe** have their own model lists; **Precise Edit** always uses Ideogram 4.5, **Inpaint** Ideogram 3.0.

### Images in and out

- Every image input accepts **binary data** of the incoming item (default property `data`) or a **public URL** the node downloads for you. Inputs that take several images (source images, reference images, masks, materials) take a comma-separated list of binary property names and/or URLs.
- Results are returned **one item per generated image or video** with the metadata in JSON (`url`, `prompt`, `resolution`, `seed`, `is_image_safe`, ...). With **Download Files** on (the default) the file is also attached as binary data, because Ideogram result URLs expire. Turn it off under **Output Options** if you only need the metadata.

### Waiting for results

Image requests are answered synchronously by default. Video, tools, Replace Background and Remove Object always run asynchronously and return a `generation_id`. With **Wait for Completion** on (the default) the node polls `GET /v2/generations/{id}` until the result is ready (configurable **Max Wait**). Turn it off to get the pending generation back immediately and fetch it later with **Generation → Get**, or pass a **Webhook URL** and let Ideogram post the result to an n8n Webhook node.

### Example: text-heavy poster → print-on-demand product

1. **Image → Generate** with Ideogram 4.5: `a retro travel poster for Kingston, Jamaica that says "ONE LOVE" in bold letters`.
2. **Image → Remove Background** on the result to get a transparent PNG.
3. Hand the binary to your print-on-demand node (for example the [Printful](https://www.npmjs.com/package/@amdrautomate/n8n-nodes-printful) community node) to create a product and render a mockup.

### Using the node as an AI-agent tool

The node is marked `usableAsTool`. Add it to an AI Agent, pick a resource and operation (for example Image → Generate), and let the agent fill the prompt with `$fromAI()`. Image inputs from URLs work well for agents; binary inputs need the file on the incoming item.

### Notes

- Ideogram allows 10 requests in flight per account by default; bursts beyond that return `429`. Run items sequentially or add a Wait node for large batches.
- Errors carry Ideogram's own message plus a hint, for example `insufficient_funds` → add credits in the API dashboard.
- The node has no runtime dependencies; multipart uploads are encoded by the node itself.
- Ideogram also publishes an official MCP server (`https://mcp.ideogram.ai/mcp`, OAuth) for chat assistants. In n8n you can attach it with the built-in MCP Client Tool node; this community node is the choice for deterministic workflow steps, binary hand-off to other nodes, batch processing and dry-run pricing without an LLM in the loop.

## Compatibility

Built and tested with n8n 2.43 (Node.js 20 and 24). Uses the Ideogram API v2 at `https://api.ideogram.ai`.

## Resources

- [Ideogram API documentation](https://developer.ideogram.ai)
- [Ideogram API pricing](https://ideogram.ai/api-pricing)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
