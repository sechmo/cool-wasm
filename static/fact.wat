(module
  (import "env" "print_string" (func $print_string (param i32)))
  (import "env" "display_result" (func $display_result (param i32)))
  (memory (export "memory") 1)
  
  (global $heap_ptr (mut i32) (i32.const 1024))
  
  (func $alloc (param $size i32) (result i32)
    (local $addr i32)
    (global.get $heap_ptr)
    (local.set $addr)
    (global.set $heap_ptr (i32.add (global.get $heap_ptr) (local.get $size)))
    (local.get $addr)
  )
  
  (func $fact (param $i i32) (result i32)
    (local $fact i32)
    (local.set $fact (i32.const 1))
    (block $exit
      (loop $loop
        (br_if $exit (i32.eq (local.get $i) (i32.const 0)))
        (local.set $fact (i32.mul (local.get $fact) (local.get $i)))
        (local.set $i (i32.sub (local.get $i) (i32.const 1)))
        (br $loop)
      )
    )
    (local.get $fact)
  )
  
  (func $int_to_string (param $n_in i32) (result i32)
    (local $n i32)         
    (local $ptr i32)       
    (local $len i32)       
    (local $digit i32)     
    (local $is_negative i32) 
    (local $temp i32)      
    (local $i i32)         
  
    (local.set $n (local.get $n_in))
    (local.set $is_negative (i32.const 0))
    (if (i32.lt_s (local.get $n) (i32.const 0))
      (then
        (local.set $is_negative (i32.const 1))
        (local.set $n (i32.sub (i32.const 0) (local.get $n)))
      )
    )
    
    (local.set $ptr (call $alloc (i32.const 12)))
    (local.set $len (i32.const 0))
    
    (if (i32.eq (local.get $n) (i32.const 0))
      (then
        (i32.store8 (local.get $ptr) (i32.const 48)) ;; 48 es el código ASCII de '0'
        (local.set $len (i32.const 1))
      )
      (else
        (block $break_loop
          (loop $digit_loop
            (if (i32.eq (local.get $n) (i32.const 0))
              (then (br $break_loop))
            )
            (local.set $digit (i32.rem_u (local.get $n) (i32.const 10)))
            (i32.store8 
              (i32.add (local.get $ptr) (local.get $len))
              (i32.add (i32.const 48) (local.get $digit))
            )
            (local.set $len (i32.add (local.get $len) (i32.const 1)))
            (local.set $n (i32.div_u (local.get $n) (i32.const 10)))
            (br $digit_loop)
          )
        )
      )
    )
    
    (if (i32.eq (local.get $is_negative) (i32.const 1))
      (then
        (i32.store8 
          (i32.add (local.get $ptr) (local.get $len))
          (i32.const 45) 
        )
        (local.set $len (i32.add (local.get $len) (i32.const 1)))
      )
    )
    
    (local.set $i (i32.const 0))
    (block $reverse_break
      (loop $reverse_loop
        (if (i32.ge_u (local.get $i) (i32.div_u (local.get $len) (i32.const 2)))
          (then (br $reverse_break))
        )
        (local.set $temp 
          (i32.load8_u (i32.add (local.get $ptr) (local.get $i)))
        )
        (i32.store8 
          (i32.add (local.get $ptr) (local.get $i))
          (i32.load8_u 
            (i32.add (local.get $ptr)
              (i32.sub (i32.sub (local.get $len) (i32.const 1)) (local.get $i))
            )
          )
        )
        (i32.store8 
          (i32.add (local.get $ptr)
            (i32.sub (i32.sub (local.get $len) (i32.const 1)) (local.get $i))
          )
          (local.get $temp)
        )
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $reverse_loop)
      )
    )
    
    (i32.store8 
      (i32.add (local.get $ptr) (local.get $len))
      (i32.const 0)
    )
    
    (local.get $ptr)
  )
  
  
  (func $main (export "main") (result i32)
    (local $n i32)
    (local $res i32)
    (local $str i32)
    
    (local.set $n (i32.const 5))
    (local.set $res (call $fact (local.get $n)))
    (local.set $str (call $int_to_string (local.get $res)))
    (call $display_result (local.get $str))
    (i32.const 0)
  )
)