import through2 from 'through2'

export const gulpRewriter = (rewriteTo = '../..') => {
  return through2.obj(function (file, _, cb) {
    const compIdentifier = new RegExp('@element-plus', 'g')

    file.contents = Buffer.from(
      file.contents.toString().replace(compIdentifier, rewriteTo)
    )
    cb(null, file)
  })
}

export default gulpRewriter
