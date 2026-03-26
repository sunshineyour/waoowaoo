import { describe, expect, it } from 'vitest'
import {
  getAddableModelTypesForProvider,
  getVisibleModelTypesForProvider,
  shouldShowOpenAICompatImageMode,
  shouldShowOpenAICompatVideoHint,
} from '@/app/[locale]/profile/components/api-config/provider-card/ProviderAdvancedFields'
import {
  buildOpenAICompatImageTemplate,
  buildOpenAICompatImageTemplatePatch,
  buildCustomPricingFromModelForm,
  buildProviderConnectionPayload,
  resolveImageApiModeFromModel,
} from '@/app/[locale]/profile/components/api-config/provider-card/hooks/useProviderCardState'

describe('provider card pricing form behavior', () => {
  it('allows openai-compatible provider to add llm/image/video', () => {
    expect(getAddableModelTypesForProvider('openai-compatible:oa-1')).toEqual(['llm', 'image', 'video'])
  })

  it('shows llm/image/video tabs by default for openai-compatible even with only image models', () => {
    const visible = getVisibleModelTypesForProvider(
      'openai-compatible:oa-1',
      {
        image: [
          {
            modelId: 'gpt-image-1',
            modelKey: 'openai-compatible:oa-1::gpt-image-1',
            name: 'Image',
            type: 'image',
            provider: 'openai-compatible:oa-1',
            price: 0,
            enabled: true,
          },
        ],
      },
    )

    expect(visible).toEqual(['llm', 'image', 'video'])
  })

  it('shows the openai-compatible video hint only for openai-compatible video add forms', () => {
    expect(shouldShowOpenAICompatVideoHint('openai-compatible:oa-1', 'video')).toBe(true)
    expect(shouldShowOpenAICompatVideoHint('openai-compatible:oa-1', 'image')).toBe(false)
    expect(shouldShowOpenAICompatVideoHint('gemini-compatible:gm-1', 'video')).toBe(false)
    expect(shouldShowOpenAICompatVideoHint('ark', 'video')).toBe(false)
  })

  it('shows the image api mode switch only for openai-compatible image models', () => {
    expect(shouldShowOpenAICompatImageMode('openai-compatible:oa-1', 'image')).toBe(true)
    expect(shouldShowOpenAICompatImageMode('openai-compatible:oa-1', 'video')).toBe(false)
    expect(shouldShowOpenAICompatImageMode('gemini-compatible:gm-1', 'image')).toBe(false)
    expect(shouldShowOpenAICompatImageMode('ark', 'image')).toBe(false)
  })

  it('builds the fixed sync image template for openai-compatible presets', () => {
    expect(buildOpenAICompatImageTemplate('sync')).toEqual({
      version: 1,
      mediaType: 'image',
      mode: 'sync',
      create: {
        method: 'POST',
        path: '/images/generations',
        contentType: 'application/json',
        bodyTemplate: {
          model: '{{model}}',
          prompt: '{{prompt}}',
        },
      },
      response: {
        outputUrlPath: '$.data[0].url',
        outputUrlsPath: '$.data',
        errorPath: '$.error.message',
      },
    })
  })

  it('builds the fixed async image template for openai-compatible presets', () => {
    expect(buildOpenAICompatImageTemplate('async')).toEqual({
      version: 1,
      mediaType: 'image',
      mode: 'async',
      create: {
        method: 'POST',
        path: '/images/generations/async',
        contentType: 'application/json',
        bodyTemplate: {
          model: '{{model}}',
          prompt: '{{prompt}}',
          size: '{{size}}',
          n: 1,
          response_format: 'url',
        },
      },
      status: {
        method: 'GET',
        path: '/images/tasks/{{task_id}}',
      },
      response: {
        taskIdPath: '$.task_id',
        statusPath: '$.status',
        outputUrlPath: '$.assets[0].downloadUrl',
        errorPath: '$.errorMessage',
      },
      polling: {
        intervalMs: 3000,
        timeoutMs: 600000,
        doneStates: ['completed', 'succeeded'],
        failStates: ['failed', 'error', 'cancelled'],
      },
    })
  })

  it('resolves async mode from openai-compatible image models only', () => {
    expect(resolveImageApiModeFromModel({
      modelId: 'banana-pro',
      modelKey: 'openai-compatible:oa-1::banana-pro',
      name: 'Banana Pro',
      type: 'image',
      provider: 'openai-compatible:oa-1',
      price: 0,
      enabled: true,
      compatMediaTemplate: buildOpenAICompatImageTemplate('async'),
    })).toBe('async')

    expect(resolveImageApiModeFromModel({
      modelId: 'banana-pro',
      modelKey: 'openai-compatible:oa-1::banana-pro',
      name: 'Banana Pro',
      type: 'image',
      provider: 'openai-compatible:oa-1',
      price: 0,
      enabled: true,
      compatMediaTemplate: buildOpenAICompatImageTemplate('sync'),
    })).toBe('sync')

    expect(resolveImageApiModeFromModel({
      modelId: 'gemini-image',
      modelKey: 'gemini-compatible:gm-1::gemini-image',
      name: 'Gemini Image',
      type: 'image',
      provider: 'gemini-compatible:gm-1',
      price: 0,
      enabled: true,
      compatMediaTemplate: buildOpenAICompatImageTemplate('async'),
    })).toBe('sync')
  })

  it('creates template patch for new openai-compatible image models and mode switches only', () => {
    const addPatch = buildOpenAICompatImageTemplatePatch({
      providerId: 'openai-compatible:oa-1',
      modelType: 'image',
      imageApiMode: 'async',
    })

    expect(addPatch).toMatchObject({
      compatMediaTemplate: buildOpenAICompatImageTemplate('async'),
      compatMediaTemplateSource: 'manual',
    })
    expect(addPatch?.compatMediaTemplateCheckedAt).toEqual(expect.any(String))

    expect(buildOpenAICompatImageTemplatePatch({
      providerId: 'openai-compatible:oa-1',
      modelType: 'image',
      imageApiMode: 'async',
      currentModel: {
        modelId: 'banana-pro',
        modelKey: 'openai-compatible:oa-1::banana-pro',
        name: 'Banana Pro',
        type: 'image',
        provider: 'openai-compatible:oa-1',
        price: 0,
        enabled: true,
        compatMediaTemplate: buildOpenAICompatImageTemplate('async'),
      },
    })).toBeNull()

    expect(buildOpenAICompatImageTemplatePatch({
      providerId: 'openai-compatible:oa-1',
      modelType: 'image',
      imageApiMode: 'sync',
      currentModel: {
        modelId: 'banana-pro',
        modelKey: 'openai-compatible:oa-1::banana-pro',
        name: 'Banana Pro',
        type: 'image',
        provider: 'openai-compatible:oa-1',
        price: 0,
        enabled: true,
        compatMediaTemplate: buildOpenAICompatImageTemplate('async'),
      },
    })).toMatchObject({
      compatMediaTemplate: buildOpenAICompatImageTemplate('sync'),
      compatMediaTemplateSource: 'manual',
    })
  })

  it('keeps payload without customPricing when pricing toggle is off', () => {
    const result = buildCustomPricingFromModelForm(
      'image',
      {
        name: 'Image',
        modelId: 'gpt-image-1',
        enableCustomPricing: false,
        basePrice: '0.8',
      },
      { needsCustomPricing: true },
    )

    expect(result).toEqual({ ok: true })
  })

  it('builds llm customPricing payload when pricing toggle is on', () => {
    const result = buildCustomPricingFromModelForm(
      'llm',
      {
        name: 'GPT',
        modelId: 'gpt-4.1',
        enableCustomPricing: true,
        priceInput: '2.5',
        priceOutput: '8',
      },
      { needsCustomPricing: true },
    )

    expect(result).toEqual({
      ok: true,
      customPricing: {
        llm: {
          inputPerMillion: 2.5,
          outputPerMillion: 8,
        },
      },
    })
  })

  it('builds media customPricing payload with option prices when enabled', () => {
    const result = buildCustomPricingFromModelForm(
      'video',
      {
        name: 'Sora',
        modelId: 'sora-2',
        enableCustomPricing: true,
        basePrice: '0.9',
        optionPricesJson: '{"resolution":{"720x1280":0.1},"duration":{"8":0.4}}',
      },
      { needsCustomPricing: true },
    )

    expect(result).toEqual({
      ok: true,
      customPricing: {
        video: {
          basePrice: 0.9,
          optionPrices: {
            resolution: {
              '720x1280': 0.1,
            },
            duration: {
              '8': 0.4,
            },
          },
        },
      },
    })
  })

  it('rejects invalid media optionPrices JSON when enabled', () => {
    const result = buildCustomPricingFromModelForm(
      'image',
      {
        name: 'Image',
        modelId: 'gpt-image-1',
        enableCustomPricing: true,
        basePrice: '0.3',
        optionPricesJson: '{"resolution":{"1024x1024":"free"}}',
      },
      { needsCustomPricing: true },
    )

    expect(result).toEqual({ ok: false, reason: 'invalid' })
  })

  it('bugfix: includes baseUrl for openai-compatible provider connection test payload', () => {
    const payload = buildProviderConnectionPayload({
      providerKey: 'openai-compatible',
      apiKey: ' sk-test ',
      baseUrl: ' https://api.openai-proxy.example/v1 ',
    })

    expect(payload).toEqual({
      apiType: 'openai-compatible',
      apiKey: 'sk-test',
      baseUrl: 'https://api.openai-proxy.example/v1',
    })
  })

  it('omits baseUrl for non-compatible provider connection test payload', () => {
    const payload = buildProviderConnectionPayload({
      providerKey: 'ark',
      apiKey: ' ark-key ',
      baseUrl: ' https://ignored.example/v1 ',
    })

    expect(payload).toEqual({
      apiType: 'ark',
      apiKey: 'ark-key',
    })
  })

  it('includes llmModel in provider connection test payload when configured', () => {
    const payload = buildProviderConnectionPayload({
      providerKey: 'openai-compatible',
      apiKey: ' sk-test ',
      baseUrl: ' https://compat.example.com/v1 ',
      llmModel: ' gpt-4.1-mini ',
    })

    expect(payload).toEqual({
      apiType: 'openai-compatible',
      apiKey: 'sk-test',
      baseUrl: 'https://compat.example.com/v1',
      llmModel: 'gpt-4.1-mini',
    })
  })
})
