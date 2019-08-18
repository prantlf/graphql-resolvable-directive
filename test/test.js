const { graphql, GraphQLSchema, GraphQLObjectType, GraphQLBoolean, DirectiveLocation } = require('graphql')
const { GraphQLResolvableDirective, supportResolvableDirectives } = require('..')
const { visitFields } = require('graphql-field-visitor')
const test = require('ava')

const falsy = { type: GraphQLBoolean }

const truthy = {
  type: GraphQLBoolean,
  resolve: () => true
}

const importantDirective = new GraphQLResolvableDirective({
  name: 'important',
  locations: [DirectiveLocation.FIELD]
})

const notDirective = new GraphQLResolvableDirective({
  name: 'not',
  locations: [DirectiveLocation.FIELD],
  async resolve (resolve) {
    const result = await resolve()
    return !result
  }
})

const setDirective = new GraphQLResolvableDirective({
  name: 'set',
  locations: [DirectiveLocation.FIELD, DirectiveLocation.FIELD_DEFINITION],
  args: { value: falsy },
  resolve: async (resolve, source, { value }) => value
})

const failDirective = new GraphQLResolvableDirective({
  name: 'fail',
  locations: [DirectiveLocation.FIELD],
  resolve () {
    throw new Error('failure')
  }
})

function createSchema (directives, fields) {
  const schema = new GraphQLSchema({
    directives: directives,
    query: new GraphQLObjectType({
      name: 'Query',
      fields: () => fields
    })
  })
  visitFields(schema, field => supportResolvableDirectives(field, schema))
  return schema
}

function collectFields (schema) {
  const fields = []
  visitFields(schema, field => fields.push(field))
  return fields
}

test('GraphQLResolvableDirective is a function object', test => {
  test.is(typeof GraphQLResolvableDirective, 'function')
  test.is(typeof GraphQLResolvableDirective.prototype, 'object')
})

test('supportResolvableDirectives is a function', test =>
  test.is(typeof supportResolvableDirectives, 'function'))

test('supportResolvableDirectives sets field resolvers', test => {
  const schema = createSchema([notDirective], { truthy })
  const fields = collectFields(schema)
  fields.forEach(field => {
    test.is(typeof field.resolve, 'function')
  })
})

test('field execution without directives is unchanged', async test => {
  const schema = createSchema([importantDirective], { truthy })
  const { data, errors } = await graphql(schema, '{ truthy }')
  test.is(typeof errors, 'undefined')
  test.is(data.truthy, true)
})

test('directives without hooks do not change the field execution result', async test => {
  const schema = createSchema([importantDirective], { truthy })
  const { data, errors } = await graphql(schema, '{ truthy @important }')
  test.is(typeof errors, 'undefined')
  test.is(data.truthy, true)
})

test('directives without hooks can change the field execution result', async test => {
  const schema = createSchema([notDirective], { truthy })
  const { data, errors } = await graphql(schema, '{ truthy @not }')
  test.is(typeof errors, 'undefined')
  test.is(data.truthy, false)
})

test('directives can support arguments', async test => {
  const schema = createSchema([setDirective], { truthy })
  const { data, errors } = await graphql(schema, '{ truthy @set(value: false) }')
  test.is(typeof errors, 'undefined')
  test.is(data.truthy, false)
})

test('directives can be chained computing the final result', async test => {
  const schema = createSchema([setDirective, notDirective], { truthy })
  const { data, errors } = await graphql(schema, '{ truthy @set(value: false) @not }')
  test.is(typeof errors, 'undefined')
  test.is(data.truthy, true)
})

test('directives throwing an error fail the field execution', async test => {
  const schema = createSchema([failDirective], { truthy })
  const { errors } = await graphql(schema, '{ truthy @fail }')
  test.is(typeof errors, 'object')
  test.is(errors.length, 1)
  test.is(errors[0].message, 'failure')
})

test('directives with hooks can handle fields without resolvers', async test => {
  const schema = createSchema([notDirective], { falsy })
  const { data, errors } = await graphql(schema, '{ falsy @not }')
  test.is(typeof errors, 'undefined')
  test.is(data.falsy, true)
})
