<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateGymRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'capacity' => 'sometimes|integer|min:1|max:500',
            'status' => 'sometimes|string|in:open,closed,maintenance',
            'openingHours' => 'sometimes|array',
            'openingHours.open' => 'required_with:openingHours|date_format:H:i',
            'openingHours.close' => 'required_with:openingHours|date_format:H:i|after:openingHours.open',
        ];
    }

    public function messages(): array
    {
        return [
            'capacity.integer' => 'Capacity must be a whole number.',
            'capacity.min' => 'Capacity must be at least 1.',
            'capacity.max' => 'Capacity cannot exceed 500.',
            'status.in' => 'Status must be open, closed or maintenance.',
            'openingHours.open.date_format' => 'Opening time must use the HH:MM format.',
            'openingHours.close.date_format' => 'Closing time must use the HH:MM format.',
            'openingHours.close.after' => 'Closing time must be later than the opening time.',
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
