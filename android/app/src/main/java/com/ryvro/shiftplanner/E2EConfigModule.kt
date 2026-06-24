package com.ryvro.shiftplanner

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

class E2EConfigModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "RyvroE2EConfig"

  override fun getConstants(): MutableMap<String, Any> =
    mutableMapOf("isE2ETestMode" to BuildConfig.E2E_TEST_MODE)
}
