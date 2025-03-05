(module
(import "cool" "abortTag" (tag $abortTag (param i32)))
(import "cool" "outStringHelper" (func
$outStringHelper
(param (ref $String))
(param (ref $String.helper.length.signature))
(param (ref $String.helper.charAt.signature))))
(import "cool" "outIntHelper" (func $outIntHelper (param i32)))
(rec
(type $Object.abort.signature (func (param (ref $Object)) (result (ref $Object))))
(type $Object.type_name.signature (func (param (ref $Object)) (result (ref $String))))
(type $Object.copy.signature (func (param (ref $Object)) (result (ref $Object))))
(type $Object#vtable (sub (struct (field $abort (ref $Object.abort.signature)) (field $type_name (ref $Object.type_name.signature)) (field $copy (ref $Object.copy.signature)))))
(type $Object (sub (struct (field $vt (ref $Object#vtable)))))
(type $String.length.signature (func (param (ref $String)) (result (ref $Int))))
(type $String.concat.signature (func (param (ref $String)) (param $arg (ref $String)) (result (ref $String))))
(type $String.substr.signature (func
(param (ref $String))
(param $arg (ref $Int))
(param $arg2 (ref $Int))
(result (ref $String))))
(type $String#vtable (sub $Object#vtable (struct
(field $abort (ref $Object.abort.signature))
(field $type_name (ref $Object.type_name.signature))
(field $copy (ref $Object.copy.signature))
(field $length (ref $String.length.signature))
(field $concat (ref $String.concat.signature))
(field $substr (ref $String.substr.signature)))))
(type $charsArr (array (mut i8)))
(type $String (sub $Object (struct (field $vt (ref $String#vtable)) (field $chars (ref $charsArr)))))
(type $IO.out_string.signature (func (param (ref $IO)) (param $arg (ref $String)) (result (ref $IO))))
(type $IO.out_int.signature (func (param (ref $IO)) (param $arg (ref $Int)) (result (ref $IO))))
(type $IO.in_string.signature (func (param (ref $IO)) (result (ref $String))))
(type $IO.in_int.signature (func (param (ref $IO)) (result (ref $Int))))
(type $IO#vtable (sub $Object#vtable (struct
(field $abort (ref $Object.abort.signature))
(field $type_name (ref $Object.type_name.signature))
(field $copy (ref $Object.copy.signature))
(field $out_string (ref $IO.out_string.signature))
(field $out_int (ref $IO.out_int.signature))
(field $in_string (ref $IO.in_string.signature))
(field $in_int (ref $IO.in_int.signature)))))
(type $IO (sub $Object (struct (field $vt (ref $IO#vtable)))))
(type $Int#vtable (sub $Object#vtable (struct (field $abort (ref $Object.abort.signature)) (field $type_name (ref $Object.type_name.signature)) (field $copy (ref $Object.copy.signature)))))
(type $Int (sub $Object (struct (field $vt (ref $Int#vtable)) (field $_val i32))))
(type $Bool#vtable (sub $Object#vtable (struct (field $abort (ref $Object.abort.signature)) (field $type_name (ref $Object.type_name.signature)) (field $copy (ref $Object.copy.signature)))))
(type $Bool (sub $Object (struct (field $vt (ref $Bool#vtable)) (field $_val i32))))
(type $Main.main.signature (func (param (ref $Main)) (result (ref $Int))))
(type $Main#vtable (sub $Object#vtable (struct
(field $abort (ref $Object.abort.signature))
(field $type_name (ref $Object.type_name.signature))
(field $copy (ref $Object.copy.signature))
(field $main (ref $Main.main.signature)))))
(type $Main (sub $Object (struct (field $vt (ref $Main#vtable)))))
(type $String.helper.length.signature (func (param (ref $String)) (result i32)))
(type $String.helper.charAt.signature (func (param (ref $String)) (param i32) (result i32))))
(global
$String.vtable.canon
(ref $String#vtable)
(ref.func $Object.abort.implementation)
(ref.func $String.type_name.implementation)
(ref.func $String.copy.implementation)
(ref.func $String.length.implementation)
(ref.func $String.concat.implementation)
(ref.func $String.substr.implementation)
(struct.new $String#vtable))
(func
$Object.abort.generic
(export "$Object.abort.generic")
(param $v (ref $Object))
(result (ref $Object))
(local.get $v)
(local.get $v)
(struct.get $Object $vt)
(struct.get $Object#vtable $abort)
(call_ref $Object.abort.signature))
(func
$Object.type_name.generic
(export "$Object.type_name.generic")
(param $v (ref $Object))
(result (ref $String))
(local.get $v)
(local.get $v)
(struct.get $Object $vt)
(struct.get $Object#vtable $type_name)
(call_ref $Object.type_name.signature))
(func
$Object.copy.generic
(export "$Object.copy.generic")
(param $v (ref $Object))
(result (ref $Object))
(local.get $v)
(local.get $v)
(struct.get $Object $vt)
(struct.get $Object#vtable $copy)
(call_ref $Object.copy.signature))
(global
$Object.vtable.canon
(ref $Object#vtable)
(ref.func $Object.abort.implementation)
(ref.func $Object.type_name.implementation)
(ref.func $Object.copy.implementation)
(struct.new $Object#vtable))
(func
$Object.copy.implementation
(type $Object.copy.signature)
(param $o (ref $Object))
(result (ref $Object))
(local $c (ref $Object))
(local.get $o)
(ref.cast (ref $Object))
(local.set $c)
(local.get $c)
(struct.get $Object $vt)
(struct.new $Object))
(global
$String.const.0
(export "$String.const.0")
(ref $String)
(global.get $String.vtable.canon)
;; O
(i32.const 79)
;; b
(i32.const 98)
;; j
(i32.const 106)
;; e
(i32.const 101)
;; c
(i32.const 99)
;; t
(i32.const 116)
(array.new_fixed $charsArr 6)
(struct.new $String))
(func
$Object.type_name.implementation
(type $Object.type_name.signature)
(param $o (ref $Object))
(result (ref $String))
(global.get $String.const.0))
(func
$String.length.generic
(export "$String.length.generic")
(param $v (ref $String))
(result (ref $Int))
(local.get $v)
(local.get $v)
(struct.get $String $vt)
(struct.get $String#vtable $length)
(call_ref $String.length.signature))
(func
$String.concat.generic
(export "$String.concat.generic")
(param $v (ref $String))
(param $arg (ref $String))
(result (ref $String))
(local.get $v)
(local.get $arg)
(local.get $v)
(struct.get $String $vt)
(struct.get $String#vtable $concat)
(call_ref $String.concat.signature))
(func
$String.substr.generic
(export "$String.substr.generic")
(param $v (ref $String))
(param $arg (ref $Int))
(param $arg2 (ref $Int))
(result (ref $String))
(local.get $v)
(local.get $arg)
(local.get $arg2)
(local.get $v)
(struct.get $String $vt)
(struct.get $String#vtable $substr)
(call_ref $String.substr.signature))
(func
$String.copy.implementation
(type $Object.copy.signature)
(param $o (ref $Object))
(result (ref $Object))
(local $c (ref $String))
(local.get $o)
(ref.cast (ref $String))
(local.set $c)
(local.get $c)
(struct.get $String $vt)
(local.get $c)
(struct.get $String $chars)
(struct.new $String))
(global
$String.const.1
(export "$String.const.1")
(ref $String)
(global.get $String.vtable.canon)
;; S
(i32.const 83)
;; t
(i32.const 116)
;; r
(i32.const 114)
;; i
(i32.const 105)
;; n
(i32.const 110)
;; g
(i32.const 103)
(array.new_fixed $charsArr 6)
(struct.new $String))
(func
$String.type_name.implementation
(type $Object.type_name.signature)
(param $o (ref $Object))
(result (ref $String))
(global.get $String.const.1))
(func
$IO.out_string.generic
(export "$IO.out_string.generic")
(param $v (ref $IO))
(param $arg (ref $String))
(result (ref $IO))
(local.get $v)
(local.get $arg)
(local.get $v)
(struct.get $IO $vt)
(struct.get $IO#vtable $out_string)
(call_ref $IO.out_string.signature))
(func
$IO.out_int.generic
(export "$IO.out_int.generic")
(param $v (ref $IO))
(param $arg (ref $Int))
(result (ref $IO))
(local.get $v)
(local.get $arg)
(local.get $v)
(struct.get $IO $vt)
(struct.get $IO#vtable $out_int)
(call_ref $IO.out_int.signature))
(func
$IO.in_string.generic
(export "$IO.in_string.generic")
(param $v (ref $IO))
(result (ref $String))
(local.get $v)
(local.get $v)
(struct.get $IO $vt)
(struct.get $IO#vtable $in_string)
(call_ref $IO.in_string.signature))
(func
$IO.in_int.generic
(export "$IO.in_int.generic")
(param $v (ref $IO))
(result (ref $Int))
(local.get $v)
(local.get $v)
(struct.get $IO $vt)
(struct.get $IO#vtable $in_int)
(call_ref $IO.in_int.signature))
(global
$IO.vtable.canon
(ref $IO#vtable)
(ref.func $Object.abort.implementation)
(ref.func $IO.type_name.implementation)
(ref.func $IO.copy.implementation)
(ref.func $IO.out_string.implementation)
(ref.func $IO.out_int.implementation)
(ref.func $IO.in_string.implementation)
(ref.func $IO.in_int.implementation)
(struct.new $IO#vtable))
(func
$IO.copy.implementation
(type $Object.copy.signature)
(param $o (ref $Object))
(result (ref $Object))
(local $c (ref $IO))
(local.get $o)
(ref.cast (ref $IO))
(local.set $c)
(local.get $c)
(struct.get $IO $vt)
(struct.new $IO))
(global
$String.const.2
(export "$String.const.2")
(ref $String)
(global.get $String.vtable.canon)
;; I
(i32.const 73)
;; O
(i32.const 79)
(array.new_fixed $charsArr 2)
(struct.new $String))
(func
$IO.type_name.implementation
(type $Object.type_name.signature)
(param $o (ref $Object))
(result (ref $String))
(global.get $String.const.2))
(global
$Int.vtable.canon
(ref $Int#vtable)
(ref.func $Object.abort.implementation)
(ref.func $Int.type_name.implementation)
(ref.func $Int.copy.implementation)
(struct.new $Int#vtable))
(func
$Int.copy.implementation
(type $Object.copy.signature)
(param $o (ref $Object))
(result (ref $Object))
(local $c (ref $Int))
(local.get $o)
(ref.cast (ref $Int))
(local.set $c)
(local.get $c)
(struct.get $Int $vt)
(local.get $c)
(struct.get $Int $_val)
(struct.new $Int))
(global
$String.const.3
(export "$String.const.3")
(ref $String)
(global.get $String.vtable.canon)
;; I
(i32.const 73)
;; n
(i32.const 110)
;; t
(i32.const 116)
(array.new_fixed $charsArr 3)
(struct.new $String))
(func
$Int.type_name.implementation
(type $Object.type_name.signature)
(param $o (ref $Object))
(result (ref $String))
(global.get $String.const.3))
(global
$Bool.vtable.canon
(ref $Bool#vtable)
(ref.func $Object.abort.implementation)
(ref.func $Bool.type_name.implementation)
(ref.func $Bool.copy.implementation)
(struct.new $Bool#vtable))
(func
$Bool.copy.implementation
(type $Object.copy.signature)
(param $o (ref $Object))
(result (ref $Object))
(local $c (ref $Bool))
(local.get $o)
(ref.cast (ref $Bool))
(local.set $c)
(local.get $c)
(struct.get $Bool $vt)
(local.get $c)
(struct.get $Bool $_val)
(struct.new $Bool))
(global
$String.const.4
(export "$String.const.4")
(ref $String)
(global.get $String.vtable.canon)
;; B
(i32.const 66)
;; o
(i32.const 111)
;; o
(i32.const 111)
;; l
(i32.const 108)
(array.new_fixed $charsArr 4)
(struct.new $String))
(func
$Bool.type_name.implementation
(type $Object.type_name.signature)
(param $o (ref $Object))
(result (ref $String))
(global.get $String.const.4))
(func
$Main.main.generic
(export "$Main.main.generic")
(param $v (ref $Main))
(result (ref $Int))
(local.get $v)
(local.get $v)
(struct.get $Main $vt)
(struct.get $Main#vtable $main)
(call_ref $Main.main.signature))
(global
$Main.vtable.canon
(ref $Main#vtable)
(ref.func $Object.abort.implementation)
(ref.func $Main.type_name.implementation)
(ref.func $Main.copy.implementation)
(ref.func $Main.main.implementation)
(struct.new $Main#vtable))
(func
$Main.copy.implementation
(type $Object.copy.signature)
(param $o (ref $Object))
(result (ref $Object))
(local $c (ref $Main))
(local.get $o)
(ref.cast (ref $Main))
(local.set $c)
(local.get $c)
(struct.get $Main $vt)
(struct.new $Main))
(global
$String.const.5
(export "$String.const.5")
(ref $String)
(global.get $String.vtable.canon)
;; M
(i32.const 77)
;; a
(i32.const 97)
;; i
(i32.const 105)
;; n
(i32.const 110)
(array.new_fixed $charsArr 4)
(struct.new $String))
(func
$Main.type_name.implementation
(type $Object.type_name.signature)
(param $o (ref $Object))
(result (ref $String))
(global.get $String.const.5))
(func
$Object.abort.implementation
(type $Object.abort.signature)
(param $o (ref $Object))
(result (ref $Object))
(i32.const -1)
(throw $abortTag))
(func
$Object.new
(export "$Object.new")
(result (ref $Object))
(global.get $Object.vtable.canon)
(struct.new $Object))
(func
$String.length.implementation
(export "$String.length.implementation")
(type $String.length.signature)
(param $s (ref $String))
(result (ref $Int))
(global.get $Int.vtable.canon)
(local.get $s)
(struct.get $String $chars)
(array.len)
(struct.new $Int))
(func
$String.substr.implementation
(export "$String.substr.implementation")
(type $String.substr.signature)
(param $s (ref $String))
(param $aInt (ref $Int))
(param $bInt (ref $Int))
(result (ref $String))
(local $diff i32)
(local $res (ref $charsArr))
(local.get $bInt)
(struct.get $Int $_val)
(array.new_default $charsArr)
(local.tee $res)
(i32.const 0)
(local.get $s)
(struct.get $String $chars)
(local.get $aInt)
(struct.get $Int $_val)
(local.get $bInt)
(struct.get $Int $_val)
(array.copy $charsArr $charsArr)
(global.get $String.vtable.canon)
(local.get $res)
(struct.new $String))
(func
$String.helper.length
(export "$String.helper.length")
(type $String.helper.length.signature)
(param $s (ref $String))
(result i32)
(local.get $s)
(struct.get $String $chars)
(array.len))
(func
$String.concat.implementation
(export "$String.concat.implementation")
(type $String.concat.signature)
(param $s0 (ref $String))
(param $s1 (ref $String))
(result (ref $String))
(local $newChars (ref $charsArr))
(local $lenS0 i32)
(local $lenS1 i32)
(local.get $s0)
(struct.get $String $chars)
(array.len)
(local.tee $lenS0)
(local.get $s1)
(struct.get $String $chars)
(array.len)
(local.tee $lenS1)
(i32.add)
(array.new_default $charsArr)
(local.tee $newChars)
(i32.const 0)
(local.get $s0)
(struct.get $String $chars)
(i32.const 0)
(local.get $lenS0)
(array.copy $charsArr $charsArr)
(local.get $newChars)
(local.get $lenS0)
(local.get $s1)
(struct.get $String $chars)
(i32.const 0)
(local.get $lenS1)
(array.copy $charsArr $charsArr)
(global.get $String.vtable.canon)
(local.get $newChars)
(struct.new $String))
(func
$String.helper.charAt
(export "$String.helper.charAt")
(type $String.helper.charAt.signature)
(param $s (ref $String))
(param $i i32)
(result i32)
(local.get $s)
(struct.get $String $chars)
(local.get $i)
(array.get $charsArr))
(func
$String.new
(export "$String.new")
(result (ref $String))
(global.get $String.vtable.canon)
(array.new_fixed $charsArr 0)
(struct.new $String))
(func
$IO.out_string.implementation
(export "$IO.out_string.implementation")
(type $IO.out_string.signature)
(param $io (ref $IO))
(param $arg (ref $String))
(result (ref $IO))
(local.get $arg)
(ref.func $String.helper.length)
(ref.func $String.helper.charAt)
(call $outStringHelper)
(local.get $io))
(func
$IO.out_int.implementation
(export "$IO.out_int.implementation")
(type $IO.out_int.signature)
(param $io (ref $IO))
(param $arg (ref $Int))
(result (ref $IO))
(local.get $arg)
(call $Int.helper.toI32)
(call $outIntHelper)
(local.get $io))
(func
$IO.in_string.implementation
(type $IO.in_string.signature)
(param (ref $IO))
(result (ref $String))
(unreachable))
(func
$IO.in_int.implementation
(type $IO.in_int.signature)
(param (ref $IO))
(result (ref $Int))
(unreachable))
(func
$IO.new
(export "$IO.new")
(result (ref $IO))
(global.get $IO.vtable.canon)
(struct.new $IO))
(func
$Int.helper.toI32
(export "$Int.helper.toI32")
(param $i (ref $Int))
(result i32)
(local.get $i)
(struct.get $Int $_val))
(func
$Int.helper.fromI32
(export "$Int.helper.fromI32")
(param $i i32)
(result (ref $Int))
(global.get $Int.vtable.canon)
(local.get $i)
(struct.new $Int))
(func
$Main.main.implementation
(type $Main.main.signature)
(param $self (ref $Main))
(result (ref $Int))
(unreachable)))
