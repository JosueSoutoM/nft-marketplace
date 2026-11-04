import { createCn } from 'cn/config'

const FONT_SIZES = ['display', 'display-sm', 'heading', 'title', 'body-lg', 'body', 'body-sm', 'caption', 'tiny']

export const cn = createCn({
  extend: { classGroups: { 'font-size': [{ text: FONT_SIZES }] } },
})
