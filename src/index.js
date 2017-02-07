import {
  isNil,
  mapValues,
  pickBy,
} from 'lodash'

import {
  combine,
  parseStyles,
} from './parse'

import {
  addValueToProperty,
  appendToKeys,
  calculateObsoleteValues,
  getInterpolator,
  omitEmptyValues,
  toString,
} from './util'

// spring presets. selected combinations of stiffness/damping.
const presets = {
  noWobble: { stiffness: 170, damping: 26 },
  gentle: { stiffness: 120, damping: 14 },
  wobbly: { stiffness: 180, damping: 12 },
  stiff: { stiffness: 210, damping: 20 },
}

// default spring options.
// damping and precision reflect the values of the `wobbly` preset,
// precision defaults to 2 which should be a good tradeoff between
// animation detail and resulting filesize.
const defaultOptions = {
  stiffness: 180,
  damping: 12,
  precision: 2,
}

// css-spring
// ----------
// invoke with startStyles, endStyles and options and gain a keyframe
// style object with interpolated values.
export const spring = (startStyles, endStyles, options = {}) => {
  let result = {}

  // define stiffness, damping and precision based on default options
  // and options given in arguments.
  const { stiffness, damping, precision } = Object.assign(
    {},
    defaultOptions,
    options,
    presets[options.preset] || {}
  )

  // get an interpolation function and parse start- and end styles
  const interpolate = getInterpolator(stiffness, damping)
  const parsed = parseStyles(startStyles, endStyles)

  // build keyframe styles based on parsed properties
  parsed.forEach(({ prop, unit, start, end, fixed }) => {
    // if start and end values differ, interpolate between them
    if (!isNil(start) && !isNil(end)) {
      interpolate(start, end).forEach((interpolated, i) => {
        // round to desired precision (except when interpolating pixels)
        let value = Number(interpolated.toFixed(unit === 'px' ? 0 : precision))
        // add unit when applicable
        value = value === 0 || !unit ? value : `${value}${unit}`
        result[i] = addValueToProperty(result[i], prop, value)
      })
    // otherwise the value is fixed and can directly be appended to the
    // resulting keyframe styles
    } else if (!isNil(fixed)) {
      for (let i = 0; i < 101; i += 1) {
        result[i] = addValueToProperty(result[i], prop, fixed)
      }
    }
  })

  // remove obsolete values, combine multiple values for the same property
  // to single ones and append % to the object keys
  const obsoleteValues = calculateObsoleteValues(result)
  result = mapValues(result, (value, i) => {
    const result = mapValues(value, (value, key) => combine(key, value))
    return pickBy(result, (_, property) => obsoleteValues[property].indexOf(Number(i)) < 0)
  })
  result = omitEmptyValues(result)
  result = appendToKeys(result, '%')

  // console.log(result)
  return result
}

// console.time('interpolate')
// spring({
//   left: '10px',
//   right: '20px',
//   padding: '0 0 10px 10rem',
//   opacity: 0,
// }, {
//   left: '20px',
//   right: 0,
//   padding: '10em 10em 0 20rem',
//   opacity: 1,
// }, {
//   preset: 'noWobble',
// })
// console.timeEnd('interpolate')

// console.time('interpolate 2')
// spring(
//   { 'margin-left': `250px`, border: '1px solid #f00' },
//   { 'margin-left': 0, border: '10px solid #f00' },
//   { preset: 'gentle' },
// )
// console.timeEnd('interpolate 2')

export { toString }
export default spring
