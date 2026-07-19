import { useEffect, useState } from 'react'

export type AssetImageStatus = 'missing' | 'loading' | 'ready' | 'error'

interface AssetImageState {
  readonly image: HTMLImageElement | null
  readonly status: AssetImageStatus
}

interface SettledAssetImageState extends AssetImageState {
  readonly sourceUrl: string
  readonly status: 'ready' | 'error'
}

const MISSING_IMAGE_STATE: AssetImageState = {
  image: null,
  status: 'missing',
}

export function useAssetImage(sourceUrl: string | undefined): AssetImageState {
  const [settledState, setSettledState] =
    useState<SettledAssetImageState | null>(null)

  useEffect(() => {
    if (!sourceUrl) {
      return
    }

    let active = true
    const image = new window.Image()

    image.decoding = 'async'
    image.onload = () => {
      if (active) {
        setSettledState({ sourceUrl, image, status: 'ready' })
      }
    }
    image.onerror = () => {
      if (active) {
        setSettledState({ sourceUrl, image: null, status: 'error' })
      }
    }
    image.src = sourceUrl

    return () => {
      active = false
      image.onload = null
      image.onerror = null
    }
  }, [sourceUrl])

  if (!sourceUrl) {
    return MISSING_IMAGE_STATE
  }

  return settledState?.sourceUrl === sourceUrl
    ? settledState
    : { image: null, status: 'loading' }
}
