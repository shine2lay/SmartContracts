pragma solidity ^0.4.24;

interface ERC20Interface {

  event Approval(address indexed src, address indexed guy, uint wad);
  event Transfer(address indexed src, address indexed dst, uint wad);

  function totalSupply() external view returns (uint);
  function balanceOf(address guy) external view returns (uint);
  function allowance(address src, address guy) external view returns (uint);

  function approve(address guy, uint wad) external returns (bool);
  function transfer(address dst, uint wad) external returns (bool);
  function transferFrom(address src, address dst, uint wad) external returns (bool);
}