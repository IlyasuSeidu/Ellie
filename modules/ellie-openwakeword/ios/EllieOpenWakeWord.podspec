require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name = 'EllieOpenWakeWord'
  s.version = package['version']
  s.summary = package['description']
  s.description = package['description']
  s.license = package['license'] || 'MIT'
  s.author = package['author'] || 'Ellie Team'
  s.homepage = package['homepage'] || 'https://example.com/ellie-openwakeword'
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.4'
  s.source = { git: 'https://example.com/ellie-openwakeword' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'onnxruntime-objc', '1.20.0'

  s.source_files = '**/*.{h,m,swift}'
  s.resource_bundles = {
    'EllieOpenWakeWordResources' => ['Resources/**/*']
  }
end
