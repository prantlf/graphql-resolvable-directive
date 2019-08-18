# graphql-resolvable-directive

[![NPM version](https://badge.fury.io/js/graphql-resolvable-directive.png)](http://badge.fury.io/js/graphql-resolvable-directive)
[![Build Status](https://travis-ci.org/prantlf/graphql-resolvable-directive.png)](https://travis-ci.org/prantlf/graphql-resolvable-directive)
[![Coverage Status](https://coveralls.io/repos/github/prantlf/graphql-resolvable-directive/badge.svg?branch=master)](https://coveralls.io/github/prantlf/graphql-resolvable-directive?branch=master)
[![devDependency Status](https://david-dm.org/prantlf/graphql-resolvable-directive/dev-status.svg)](https://david-dm.org/prantlf/graphql-resolvable-directive#info=devDependencies)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

[![NPM Downloads](https://nodei.co/npm/graphql-resolvable-directive.png?downloads=true&stars=true)](https://www.npmjs.com/package/graphql-resolvable-directive)

Supports GraphQL custom directives that hook into the field execution. It can be used for validation or transformation of the resulting field values.

## Synopsis

```js
const {
  GraphQLResolvableDirective, supportResolvableDirectives
} = require('graphql-resolvable-directive')

// Performs the logical negation on the field value.
const notDirective = new GraphQLResolvableDirective({
  name: 'not',
  description: 'Negates the field execution result.',
  locations: [DirectiveLocation.FIELD],
  async resolve (resolve, source, args, context, info) {
    const result = await resolve()
    return !result
  }
})

// Exposes a single field "falsy" returning the `null` value.
// Recognizes the `not` directive.
const schema = new GraphQLSchema({
  directives: [notDirective],
  query: new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
      falsy: { type: GraphQLBoolean }
    })
  })
})
visitFields(schema, field => supportCustomDirectives(field, schema))

// Returns `true` instead of the default `null`.
const { data } = await graphql(schema, '{ falsy @not }')
assert(data.falsy)
```

## Installation

This module can be installed in your project using [NPM] or [Yarn]. Make sure, that you use [Node.js] version 8 or newer.

```sh
$ npm i graphql-resolvable-directive -S
```

```sh
$ yarn add graphql-resolvable-directive
```

## Description

### GraphQLResolvableDirective

Base class for custom directives with field execution hooks. If they include the `resolve` method, it will be called  instead of the original field resolver. It would usually call the original resolver to inspect or modify its result.

```js
const { GraphQLResolvableDirective } = require('graphql-resolvable-directive')

const isTruthyDirective = new GraphQLResolvableDirective({
  name: 'isTruthy',
  description: 'Checks if the field execution result is truthy.',
  locations: [DirectiveLocation.FIELD],
  async resolve (resolve, source, args, context, info) {
    const result = await resolve()
    if (!result) {
      throw new Error(`The field "${info.fieldName}" was not truthy.`)
    }
    return result
  }
})

const toLowerCaseDirective = new GraphQLResolvableDirective({
  name: 'toLowerCase',
  description: 'Converts a string value to lower-case.',
  locations: [DirectiveLocation.FIELD],
  async resolve (resolve, source, args, context, info) {
    const result = await resolve()
    return result.toLowerCase()
  }
})
```

If the directives are chained, the results are passed from the first directive to the next one and so on. The last returned value is assigned to the field.

```js
graphql(schema, '{ name @isTruthy @toLowerCase }')
```

### supportCustomDirectives(field, schema)

Enables hooking into the field execution by a custom directive for the specified field. Directives have to be provided in the schema configuration.

* `field` has to be a field configuration object
* `schema` has to be an object instance of the type `GraphQLSchema`

Field configurations are usually obtained from a schema by a field visitor like [graphql-field-visitor], for example.

```js
const { supportResolvableDirectives } = require('graphql-resolvable-directive')
const { visitFields } = require('graphql-field-visitor')

const schema =  new GraphQLSchema({
  directives: [isTruthyDirective, toLowerCaseDirective],
  query: ...
})

visitFields(schema, field => supportCustomDirectives(field, schema))
```

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.  Add unit tests for any new or changed functionality. Lint and test your code using Grunt.

## Release History

* 2019-08-18   v0.0.1   Initial release

## License

Copyright (c) 2019 Ferdinand Prantl

Licensed under the MIT license.

[Node.js]: http://nodejs.org/
[NPM]: https://www.npmjs.com/
[Yarn]: https://yarnpkg.com/
[graphql-field-visitor]: https://github.com/prantlf/graphql-field-visitor
