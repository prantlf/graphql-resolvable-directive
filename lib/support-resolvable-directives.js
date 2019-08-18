const { defaultFieldResolver, getDirectiveValues } = require('graphql')
const builtInDirectives = ['deprecated', 'skip', 'include']

function wrapResolve (resolve, source, args, context, info) {
  return async () => {
    try {
      const result = await resolve(source, args, context, info)
      return result
    } catch (error) {
      /* istanbul ignore next */
      return Promise.reject(error)
    }
  }
}

function wrapResolveAdapter (resolve, nextResolver, source, args, context, info) {
  return async () => {
    try {
      const result = await resolve(nextResolver, source, args, context, info)
      return result
    } catch (error) {
      return Promise.reject(error)
    }
  }
}

function getDirectiveInfo (directive, schema, variables) {
  const Directive = schema.getDirective(directive.name.value)
  const resolve = Directive.resolve
  const args = getDirectiveValues(Directive, { directives: [directive] }, variables)
  return { args, resolve }
}

function filterCustomDirectives (directives) {
  return directives.filter(directive =>
    builtInDirectives.indexOf(directive.name.value) < 0)
}

function chainDirectiveResolvers (schema, directives, originalResolve, source, args, context, info) {
  const { variableValues } = info
  const directiveInfos = directives
    .map(directive => getDirectiveInfo(directive, schema, variableValues))
    .filter(({ resolve }) => resolve)
  if (!directiveInfos.length) {
    return undefined
  }
  const firstResolver = wrapResolve(originalResolve, source, args, context, info)
  return directiveInfos.reduce((nextResolver, { args, resolve }) =>
    wrapResolveAdapter(resolve, nextResolver, source, args, context, info), firstResolver)
}

function createFieldResolver (field, schema) {
  const originalResolve = field.resolve || defaultFieldResolver
  return (source, args, context, info) => {
    const directives = filterCustomDirectives(info.fieldNodes[0].directives)
    if (!directives.length) {
      return originalResolve(source, args, context, info)
    }
    const resolve = chainDirectiveResolvers(
      schema, directives, originalResolve, source, args, context, info)
    if (!resolve) {
      return originalResolve(source, args, context, info)
    }
    return resolve()
  }
}

function supportResolvableDirectives (field, schema) {
  field.resolve = createFieldResolver(field, schema)
}

module.exports = supportResolvableDirectives
