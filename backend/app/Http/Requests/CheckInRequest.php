<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class CheckInRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'gymId' => 'required|string',
            'nfcPayload' => 'required|string',
        ];
    }

    public function messages(): array
    {
        return [
            'gymId.required' => 'Gym ID is required.',
            'nfcPayload.required' => 'NFC payload is required. Tap the SGC-GYM sticker.',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'status' => 'error',
            'message' => 'Validation failed.',
            'errors' => $validator->errors()
        ], 422));
    }
}
