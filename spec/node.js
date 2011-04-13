
require.paths.unshift('spec', '/usr/local/Cellar/ruby/1.9.1-p378/lib/ruby/gems/1.9.1/gems/jspec-4.3.1/lib', 'lib')
require('jspec')
require('unit/spec.helper')
require('yourlib')

JSpec
  .exec('spec/unit/spec.js')
  .run({ reporter: JSpec.reporters.Terminal, fixturePath: 'spec/fixtures', failuresOnly: true })
  .report()
