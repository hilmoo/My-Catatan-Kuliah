package typex

func Int32Ptr(i int) *int32 {
	res := int32(i)
	return &res
}

func Int32Value(i *int32) int32 {
	if i == nil {
		return 0
	}
	return *i
}

func IntFromInt32Ptr(i *int32) int {
	if i == nil {
		return 0
	}
	return int(*i)
}

func Float64PtrFromFloat32Ptr(f *float32) *float64 {
	if f == nil {
		return nil
	}
	res := float64(*f)
	return &res
}

func PtrIntToInt32(i *int) *int32 {
	if i == nil {
		return nil
	}
	res := int32(*i)
	return &res
}