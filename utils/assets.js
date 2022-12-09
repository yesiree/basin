import crypto from 'crypto'

const escapeRegExp = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const splitPath = path => {
  let i = path.length - 1
  while (i > -1) {
    if (path[i] === '/') {
      i = -1
      break
    } else if (path[i] === '.') {
      break
    }
    --i
  }
  let base = path
  let ext = ''
  if (i > -1) {
    base = path.slice(0, i)
    ext = path.slice(i + 1)
  }
  return [base, ext]
}

const getHash = content => {
  let hash = crypto
    .createHash('md5')
    .update(content)
    .digest('hex')
  if (typeof BigInt === 'undefined') {
    hash = hash.slice(0, 25)
  } else {
    if (hash.length % 2) hash = '0' + hash
    hash = BigInt('0x' + hash).toString(36)
  }
  return hash
}

export const getCacheBustingPath = (path, content) => {
  const hash = getHash(content)
  const [base, ext] = splitPath(path)
  return `${base}.${hash}.${ext}`
}

export const replaceWithCacheBustingPath = ({
  path,
  content,
  cacheBustingPath = getCacheBustingPath(path, content),
  openingTag,
  closingTag,
}) => {
  const [base, ext] = splitPath(path)
  let reStr = escapeRegExp(base) + '(\\.[a-z0-9]{25})?'
  if (ext) reStr += escapeRegExp('.' + ext)
  if (openingTag && closingTag) {
    reStr = escapeRegExp(openingTag) + '\\s*?'
      + reStr
      + '\\s*?' + escapeRegExp(closingTag)
  }
  const re = new RegExp(reStr, 'g')
  return content.replace(re, cacheBustingPath)
}
