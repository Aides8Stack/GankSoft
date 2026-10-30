import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyWindowsIdentity} from '../tools/validation/v077/windows-platform.mjs';

const classify=(build,type,arch='x64')=>classifyWindowsIdentity({
  platform:'win32',release:'10.0.'+build,arch,productType:type,
  identitySource:'Win32_OperatingSystem'
});
test('real Windows 10 x64 client reports win10',()=>{
  const x=classify(19045,1);
  assert.equal(x.family,'win10');assert.equal(x.clientVerified,true);
});
test('real Windows 11 x64 client reports win11',()=>{
  const x=classify(26100,1);
  assert.equal(x.family,'win11');assert.equal(x.productType,1);
});
test('Windows Server 2025 build 26100 CANNOT be called Win11',()=>{
  for(const type of [2,3]){
    const x=classify(26100,type);
    assert.equal(x.family,'windows_server');assert.equal(x.clientVerified,false);
  }
});
test('missing CIM ProductType fails closed',()=>{
  for(const type of [null,undefined,'']){
    const x=classify(26100,type);
    assert.equal(x.family,'unverified');assert.equal(x.clientVerified,false);
  }
});
test('unsupported platform, build and architecture cannot be clients',()=>{
  assert.equal(classifyWindowsIdentity({platform:'linux',arch:'x64',release:'10.0.26100',productType:1}).family,'not_windows');
  assert.equal(classify(18363,1).family,'unsupported');
  assert.equal(classify(26100,1,'arm64').family,'unsupported');
});
