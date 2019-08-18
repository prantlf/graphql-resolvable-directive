const { GraphQLDirective } = require('graphql')

function GraphQLResolvableDirective (config) {
  const directive = new GraphQLDirective(config)
  if (config.resolve) {
    directive.resolve = config.resolve
  }
  return directive
}

module.exports = GraphQLResolvableDirective
